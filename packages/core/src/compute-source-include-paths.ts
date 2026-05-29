import { SOURCE_FILE_PATTERN } from "./constants.js";

/**
 * Narrows an explicit include-path list (diff / staged changed files)
 * to the source extensions oxlint actually lints. Uses
 * `SOURCE_FILE_PATTERN` (`.ts/.tsx/.js/.jsx`) — NOT a JSX-only filter —
 * so adopted rules that fire on plain `.ts`/`.js` (e.g. `unicorn/*`,
 * `eslint/no-debugger`) and react-doctor rules keep their coverage in
 * diff / staged mode. Returns `undefined` for an empty input so the
 * caller falls through to a full scan.
 */
export const computeSourceIncludePaths = (includePaths: string[]): string[] | undefined =>
  includePaths.length > 0
    ? includePaths.filter((filePath) => SOURCE_FILE_PATTERN.test(filePath))
    : undefined;
