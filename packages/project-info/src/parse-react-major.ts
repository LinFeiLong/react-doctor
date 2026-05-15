// HACK: react-doctor reads the project's React version straight out of
// package.json, which produces semver ranges (`^19.0.0`, `~18.3.1`,
// `>=18 <20`, `19.x`, `latest`, etc.) — never a normalized number. The
// rule registry needs an integer major to gate React-19-only rules
// (e.g. `no-react19-deprecated-apis`, `no-default-props`) without
// false-positive flagging on React 17 / 18 codebases.
//
// We drop upper-bound comparators, then grab the FIRST remaining integer.
// That gives the right answer for every lower-bound shape we see in
// practice:
//   "19.0.0" → 19, "^18.3.1" → 18, "~17.0.2" → 17, ">=18 <20" → 18,
//   "19.x" → 19, "<19" → null, "workspace:*" → null, "*" → null.
//
// Returning `null` for tags ("latest", "next"), workspace protocols,
// and ranges that don't carry a concrete lower bound is intentional:
// callers should treat `null` as "unknown — do not enable version-gated
// rules" so React-19-only migrations don't false-positive on React 18
// projects whose exact version could not be classified.
const UPPER_BOUND_COMPARATOR = /<\s*=?\s*\d+(?:\.\d+){0,2}(?:-[^\s,|]+)?/g;

export const parseReactMajor = (reactVersion: string | null | undefined): number | null => {
  if (typeof reactVersion !== "string") return null;
  const trimmed = reactVersion.replace(UPPER_BOUND_COMPARATOR, " ").trim();
  if (trimmed.length === 0) return null;
  const match = trimmed.match(/(\d+)/);
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  // HACK: React publishes experimental / canary builds as
  // `0.0.0-experimental-<sha>` to keep stable consumers safe. The
  // first-integer scan would land on `0`, which is then `< 18` and
  // treats the build as pre-React. Reject `0` → null so experimental
  // ranges remain unknown instead of being misclassified as ancient React
  // (no realistic React project ships a true major-0 release we'd need to
  // distinguish — anything pre-1 predates the React rewrite by years).
  if (!Number.isFinite(major) || major <= 0) return null;
  return major;
};
