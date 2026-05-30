import fs from "node:fs";
import path from "node:path";
import { codeFrameColumns } from "@babel/code-frame";
import { CODE_FRAME_LINES_ABOVE, CODE_FRAME_LINES_BELOW } from "@react-doctor/core";

interface CodeFrameInput {
  readonly filePath: string;
  readonly line: number;
  readonly column: number;
  readonly rootDirectory: string;
}

/**
 * Renders a syntax-highlighted source excerpt around a diagnostic site
 * with a caret pointing at the offending column. Returns null when the
 * file can't be read (e.g. multi-project summaries where paths are
 * resolved against a different cwd), so callers can fall back to the
 * bare `file:line` reference instead of failing the whole render.
 */
export const buildCodeFrame = (input: CodeFrameInput): string | null => {
  if (input.line <= 0) return null;

  const absolutePath = path.isAbsolute(input.filePath)
    ? input.filePath
    : path.resolve(input.rootDirectory || ".", input.filePath);

  let source: string;
  try {
    source = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }

  return codeFrameColumns(
    source,
    { start: { line: input.line, column: input.column > 0 ? input.column : undefined } },
    {
      highlightCode: true,
      linesAbove: CODE_FRAME_LINES_ABOVE,
      linesBelow: CODE_FRAME_LINES_BELOW,
    },
  );
};
