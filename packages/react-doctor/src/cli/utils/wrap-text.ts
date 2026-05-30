/**
 * Greedy word-wrap on whitespace boundaries. Words longer than the
 * limit are kept intact on their own line rather than hard-split, so
 * identifiers and URLs stay copy-pasteable.
 */
export const wrapText = (text: string, maxWidth: number): string[] => {
  const lines: string[] = [];
  let currentLine = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (currentLine.length === 0) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
};
