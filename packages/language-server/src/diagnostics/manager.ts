import type { Diagnostic as LspDiagnostic, Position } from "vscode-languageserver";
import { SILENT_LOGGER, type Logger, type ScanOutcome, type TextProvider } from "../types.js";
import { isPositionInRange } from "../text/positions.js";
import { fsPathToUri } from "../text/uri.js";
import { toLspDiagnostic } from "./mapper.js";

export interface DiagnosticsManagerOptions {
  /** Sends the authoritative diagnostic set for a URI to the client. */
  readonly publish: (uri: string, diagnostics: LspDiagnostic[]) => void;
  /** Resolves current file text (open buffer or disk) for precise ranges. */
  readonly textProvider: TextProvider;
  readonly logger?: Logger;
}

const toUri = (absoluteFilePath: string): string => fsPathToUri(absoluteFilePath);

/**
 * Owns the published-diagnostic state. Maps scan outcomes to LSP
 * diagnostics, publishes complete per-URI replacement sets (so the
 * client never accumulates duplicates), and clears stale diagnostics
 * when a project rescan no longer reports a file. Also answers
 * position lookups for hovers and pull-diagnostic requests.
 */
export class DiagnosticsManager {
  private readonly byUri = new Map<string, LspDiagnostic[]>();
  private readonly projectUris = new Map<string, Set<string>>();
  private readonly publish: DiagnosticsManagerOptions["publish"];
  private readonly textProvider: TextProvider;
  private readonly logger: Logger;

  constructor(options: DiagnosticsManagerOptions) {
    this.publish = options.publish;
    this.textProvider = options.textProvider;
    this.logger = options.logger ?? SILENT_LOGGER;
  }

  /** Applies a completed scan: maps, stores, publishes, and clears stale URIs. */
  applyOutcome(outcome: ScanOutcome): void {
    if (!outcome.ok && !outcome.skipped) {
      this.logger.warn(
        `Scan of ${outcome.request.projectDirectory} failed: ${outcome.error ?? "unknown error"}`,
      );
    }

    const project = outcome.request.projectDirectory;
    const liveUris = new Set<string>();

    for (const [fsPath, coreDiagnostics] of outcome.byFile) {
      const uri = toUri(fsPath);
      const text = this.textProvider(fsPath);
      const lspDiagnostics = coreDiagnostics.map((diagnostic) =>
        toLspDiagnostic({ diagnostic, fsPath, text }),
      );
      if (lspDiagnostics.length > 0) {
        this.byUri.set(uri, lspDiagnostics);
        liveUris.add(uri);
      } else {
        this.byUri.delete(uri);
      }
      this.publish(uri, lspDiagnostics);
    }

    // Files explicitly requested but absent from byFile were scanned
    // clean — clear any diagnostics previously shown for them.
    for (const fsPath of outcome.requestedPaths) {
      if (outcome.byFile.has(fsPath)) continue;
      const uri = toUri(fsPath);
      if (this.byUri.has(uri)) this.byUri.delete(uri);
      this.publish(uri, []);
    }

    this.reconcileProjectUris(project, liveUris, outcome);
  }

  private reconcileProjectUris(project: string, liveUris: Set<string>, outcome: ScanOutcome): void {
    if (outcome.coversProject) {
      const previous = this.projectUris.get(project) ?? new Set<string>();
      for (const uri of previous) {
        if (liveUris.has(uri)) continue;
        this.byUri.delete(uri);
        this.publish(uri, []);
      }
      this.projectUris.set(project, liveUris);
      return;
    }

    const set = this.projectUris.get(project) ?? new Set<string>();
    for (const uri of liveUris) set.add(uri);
    for (const fsPath of outcome.requestedPaths) {
      const uri = toUri(fsPath);
      if (!liveUris.has(uri)) set.delete(uri);
    }
    this.projectUris.set(project, set);
  }

  /** Current published diagnostics for a URI (for pull-diagnostic requests). */
  get(uri: string): LspDiagnostic[] {
    return this.byUri.get(uri) ?? [];
  }

  /** Diagnostics whose range contains `position` (for hover / code actions). */
  findAt(uri: string, position: Position): LspDiagnostic[] {
    return (this.byUri.get(uri) ?? []).filter((diagnostic) =>
      isPositionInRange(diagnostic.range, position),
    );
  }

  /** Every URI that currently has published diagnostics. */
  trackedUris(): string[] {
    return [...this.byUri.keys()];
  }

  /** Clears (and publishes empty for) every URI owned by a project. */
  clearProject(project: string): void {
    const uris = this.projectUris.get(project);
    if (!uris) return;
    for (const uri of uris) {
      this.byUri.delete(uri);
      this.publish(uri, []);
    }
    this.projectUris.delete(project);
  }

  /** Clears a single URI. */
  clearUri(uri: string): void {
    if (this.byUri.delete(uri)) this.publish(uri, []);
    for (const uris of this.projectUris.values()) uris.delete(uri);
  }
}
