import { calculateScore, getScoreLabel, type ScoreDiagnostic } from "react-doctor/score";

const MAX_REQUEST_BODY_BYTES = 1_000_000;
const MAX_DIAGNOSTICS_PER_REQUEST = 50_000;

const DEFAULT_CATEGORY = "uncategorized";

const isValidScoreDiagnostic = (value: unknown): value is ScoreDiagnostic => {
  if (typeof value !== "object" || value === null) return false;
  const plugin = Reflect.get(value, "plugin");
  const rule = Reflect.get(value, "rule");
  const category = Reflect.get(value, "category");
  const severity = Reflect.get(value, "severity");
  return (
    typeof plugin === "string" &&
    typeof rule === "string" &&
    (severity === "error" || severity === "warning") &&
    (category === undefined || typeof category === "string")
  );
};

const toScoreDiagnostic = (entry: unknown): ScoreDiagnostic | null => {
  if (!isValidScoreDiagnostic(entry)) return null;
  // Tolerate older CLI versions that don't send `category` — bucket those
  // diagnostics into a single fallback category so the per-category cap
  // still applies sensibly.
  return {
    plugin: entry.plugin,
    rule: entry.rule,
    category: entry.category ?? DEFAULT_CATEGORY,
    severity: entry.severity,
  };
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const OPTIONS = (): Response => new Response(null, { status: 204, headers: CORS_HEADERS });

const respondError = (status: number, message: string): Response =>
  Response.json({ error: message }, { status, headers: CORS_HEADERS });

export const POST = async (request: Request): Promise<Response> => {
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return respondError(400, "Request body must be readable text");
  }

  if (new TextEncoder().encode(bodyText).byteLength > MAX_REQUEST_BODY_BYTES) {
    return respondError(413, "Request body exceeds 1MB");
  }

  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = null;
  }

  if (typeof body !== "object" || body === null) {
    return respondError(400, "Request body must be a JSON object");
  }
  const diagnosticsField = Reflect.get(body, "diagnostics");
  if (!Array.isArray(diagnosticsField)) {
    return respondError(400, "Request body must contain a 'diagnostics' array");
  }
  if (diagnosticsField.length > MAX_DIAGNOSTICS_PER_REQUEST) {
    return respondError(413, "Too many diagnostics in a single request");
  }

  const diagnostics: ScoreDiagnostic[] = [];
  for (const entry of diagnosticsField) {
    const diagnostic = toScoreDiagnostic(entry);
    if (!diagnostic) {
      return respondError(
        400,
        "Each diagnostic must have a string 'plugin', string 'rule', and 'severity' of 'error' or 'warning'",
      );
    }
    diagnostics.push(diagnostic);
  }

  const score = calculateScore(diagnostics);

  return Response.json({ score, label: getScoreLabel(score) }, { headers: CORS_HEADERS });
};
