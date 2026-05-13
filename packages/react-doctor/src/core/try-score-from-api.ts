import { FETCH_TIMEOUT_MS, MILLISECONDS_PER_SECOND, SCORE_API_URL } from "../constants.js";
import { collectScoreDiagnostics } from "./issue-to-score-diagnostic.js";
import type { ReactDoctorIssue, ReactDoctorScore } from "./types.js";

const parseScoreResult = (value: unknown): ReactDoctorScore | null => {
  if (typeof value !== "object" || value === null) return null;
  if (!("score" in value) || !("label" in value)) return null;
  const scoreValue = Reflect.get(value, "score");
  const labelValue = Reflect.get(value, "label");
  if (typeof scoreValue !== "number" || typeof labelValue !== "string") return null;
  return { value: scoreValue, label: labelValue };
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");

const describeFailure = (error: unknown): string => {
  if (isAbortError(error)) {
    return `timed out after ${FETCH_TIMEOUT_MS / MILLISECONDS_PER_SECOND}s`;
  }
  if (error instanceof Error && error.message) return error.message;
  return String(error);
};

export interface TryScoreFromApiOptions {
  silent?: boolean;
}

export const tryScoreFromApi = async (
  issues: ReactDoctorIssue[],
  fetchImplementation: typeof fetch | undefined,
  options: TryScoreFromApiOptions = {},
): Promise<ReactDoctorScore | null> => {
  if (typeof fetchImplementation !== "function") return null;

  const warn = options.silent ? () => {} : (message: string) => console.warn(message);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(SCORE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnostics: collectScoreDiagnostics(issues) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      warn(
        `[react-doctor] Score API returned ${response.status} ${response.statusText} — using local scoring`,
      );
      return null;
    }

    return parseScoreResult(await response.json());
  } catch (error) {
    warn(`[react-doctor] Score API unreachable (${describeFailure(error)}) — using local scoring`);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};
