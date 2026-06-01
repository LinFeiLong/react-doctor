import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import {
  DEBUG_LOG_DIRECTORY_NAME,
  DEBUG_MAX_DEDUP_ENTRIES,
  DEBUG_SESSION_ID_BYTE_LENGTH,
} from "./constants.js";
import {
  readDebugServerLock,
  removeDebugServerLock,
  writeDebugServerLock,
} from "./debug-server-lock.js";
import { pingDebugServer } from "./ping-debug-server.js";

export interface DebugServerOptions {
  sessionId?: string;
  cwd?: string;
  logPath?: string;
  host?: string;
  port?: number;
}

export interface DebugServerInfo {
  sessionId: string;
  port: number;
  endpoint: string;
  logPath: string;
}

export interface DebugServerResult {
  server: http.Server | null;
  info: DebugServerInfo;
  reused: boolean;
}

interface DebugSessionState {
  logPath: string;
  processedEntryIds: Set<string>;
}

// Session ids index a per-session log filename (`debug-<id>.log`), so they
// must stay within the log directory: only word chars, dash, underscore —
// no path separators or `..`.
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const parseIngestSessionId = (url: string): string | null => {
  try {
    const { pathname } = new URL(url, "http://localhost");
    const match = pathname.match(/^\/ingest\/([a-zA-Z0-9_-]+)\/?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

export const createDebugServer = async (
  options: DebugServerOptions = {},
): Promise<DebugServerResult> => {
  if (options.sessionId !== undefined && !SESSION_ID_PATTERN.test(options.sessionId)) {
    throw new Error(
      "Invalid --session-id: only letters, digits, '-' and '_' are allowed (no path separators).",
    );
  }
  const sessionId =
    options.sessionId || crypto.randomBytes(DEBUG_SESSION_ID_BYTE_LENGTH).toString("hex");
  const logDirectory = path.join(options.cwd || os.tmpdir(), DEBUG_LOG_DIRECTORY_NAME);
  const primaryLogPath = options.logPath || path.join(logDirectory, `debug-${sessionId}.log`);
  const host = options.host || "127.0.0.1";
  const requestedPort = options.port || 0;

  if (!fs.existsSync(logDirectory)) fs.mkdirSync(logDirectory, { recursive: true });

  const existingLock = readDebugServerLock(logDirectory);
  if (existingLock) {
    const isAlive = await pingDebugServer(existingLock.host, existingLock.port);
    if (isAlive) {
      return {
        server: null,
        info: {
          sessionId: existingLock.sessionId,
          port: existingLock.port,
          endpoint: existingLock.endpoint,
          logPath: existingLock.logPath,
        },
        reused: true,
      };
    }
    removeDebugServerLock(logDirectory);
  }

  const sessions = new Map<string, DebugSessionState>();

  const getSessionState = (requestSessionId: string): DebugSessionState => {
    const existing = sessions.get(requestSessionId);
    if (existing) return existing;

    const sessionLogPath =
      requestSessionId === sessionId
        ? primaryLogPath
        : path.join(logDirectory, `debug-${requestSessionId}.log`);
    const state: DebugSessionState = { logPath: sessionLogPath, processedEntryIds: new Set() };
    sessions.set(requestSessionId, state);
    return state;
  };

  const server = http.createServer((request, response) => {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const url = request.url || "/";

    if (url === "/" && request.method === "GET") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    const requestSessionId = parseIngestSessionId(url);
    if (!requestSessionId) {
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const sessionState = getSessionState(requestSessionId);

    if (request.method === "POST") {
      let requestBody = "";
      request.on("data", (chunk: Buffer) => (requestBody += chunk));
      request.on("end", () => {
        try {
          const logEntry = JSON.parse(requestBody);

          if (logEntry.id && sessionState.processedEntryIds.has(logEntry.id)) {
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ ok: true, duplicate: true }));
            return;
          }

          logEntry.sessionId = logEntry.sessionId || requestSessionId;
          logEntry.timestamp = logEntry.timestamp || Date.now();
          fs.appendFileSync(sessionState.logPath, JSON.stringify(logEntry) + "\n");

          if (logEntry.id) {
            if (sessionState.processedEntryIds.size >= DEBUG_MAX_DEDUP_ENTRIES) {
              sessionState.processedEntryIds.clear();
            }
            sessionState.processedEntryIds.add(logEntry.id);
          }

          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ ok: true }));
        } catch {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "Invalid JSON" }));
        }
      });
      request.on("error", () => {
        if (!response.writableEnded) {
          response.writeHead(400, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "Request error" }));
        }
      });
      return;
    }

    if (request.method === "DELETE") {
      try {
        if (fs.existsSync(sessionState.logPath)) fs.unlinkSync(sessionState.logPath);
        sessionState.processedEntryIds.clear();
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ ok: true, cleared: true }));
      } catch {
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "Failed to clear log" }));
      }
      return;
    }

    if (request.method === "GET") {
      try {
        const logContent = fs.existsSync(sessionState.logPath)
          ? fs.readFileSync(sessionState.logPath, "utf-8")
          : "";
        response.writeHead(200, { "Content-Type": "application/x-ndjson" });
        response.end(logContent);
      } catch {
        response.writeHead(500, { "Content-Type": "text/plain" });
        response.end("Failed to read log");
      }
      return;
    }

    response.writeHead(405).end();
  });

  return new Promise<DebugServerResult>((resolve, reject) => {
    server.listen(requestedPort, host, () => {
      const serverAddress = server.address();
      if (!serverAddress || typeof serverAddress === "string") {
        reject(new Error("Failed to get debug server address"));
        return;
      }

      const info: DebugServerInfo = {
        sessionId,
        port: serverAddress.port,
        endpoint: `http://${host}:${serverAddress.port}/ingest/${sessionId}`,
        logPath: primaryLogPath,
      };

      writeDebugServerLock(logDirectory, {
        pid: process.pid,
        host,
        port: serverAddress.port,
        sessionId,
        endpoint: info.endpoint,
        logPath: primaryLogPath,
      });

      server.on("close", () => removeDebugServerLock(logDirectory));
      // SIGINT runs the CLI's `exitGracefully` handler, which calls
      // `process.exit` before the server's `close` event can fire, so wire
      // lock removal to `exit` (always fires) to avoid a stale lock file.
      process.once("exit", () => removeDebugServerLock(logDirectory));

      resolve({ server, info, reused: false });
    });
    server.on("error", reject);
  });
};
