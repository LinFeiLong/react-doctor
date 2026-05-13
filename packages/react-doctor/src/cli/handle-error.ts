import { CANONICAL_GITHUB_URL, EXIT_FAILURE_CODE } from "../constants.js";
import { highlighter } from "./highlighter.js";

const stringifyError = (error: unknown): string => {
  if (error instanceof Error) return error.message || error.name;
  return String(error);
};

const getErrorMessageChain = (error: unknown): string[] => {
  const messages: string[] = [];
  const visited = new Set<unknown>();
  let currentError = error;

  while (currentError instanceof Error && !visited.has(currentError)) {
    visited.add(currentError);
    messages.push(stringifyError(currentError));
    currentError = currentError.cause;
  }

  if (messages.length === 0) {
    messages.push(stringifyError(error));
  }

  return messages;
};

export const handleCliError = (error: unknown): void => {
  const errorChain = getErrorMessageChain(error).join("\nCaused by: ");

  console.error("");
  console.error(highlighter.error("Something went wrong. Please check the error below."));
  console.error(
    highlighter.error(`If the problem persists, open an issue at ${CANONICAL_GITHUB_URL}/issues.`),
  );
  console.error("");
  console.error(highlighter.error(errorChain));
  console.error("");
  process.exitCode = EXIT_FAILURE_CODE;
};
