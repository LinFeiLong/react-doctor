export interface SourceLocation {
  readonly line: number;
  readonly column: number;
}

// O(content) per call — memoizing line offsets is a tracked follow-up.
export const getLocationAtIndex = (content: string, matchIndex: number): SourceLocation => {
  if (matchIndex < 0) return { line: 1, column: 1 };
  const prefix = content.slice(0, matchIndex);
  const lines = prefix.split(/\r?\n/);
  return {
    line: lines.length,
    column: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
};
