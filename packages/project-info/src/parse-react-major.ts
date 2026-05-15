// HACK: react-doctor reads the project's React version straight out of
// package.json, which produces semver ranges (`^19.0.0`, `~18.3.1`,
// `>=18 <20`, `19.x`, `latest`, etc.) — never a normalized number. The
// rule registry needs an integer major to gate React-19-only rules
// (e.g. `no-react19-deprecated-apis`, `no-default-props`) without
// false-positive flagging on React 17 / 18 codebases.
//
// We drop upper-bound comparators, then grab the first semver-like lower-bound
// integer.
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
const HAS_UPPER_BOUND_COMPARATOR = /<\s*=?\s*\d+(?:\.\d+){0,2}(?:-[^\s,|]+)?/;
const OR_SEPARATOR = /\s*\|\|\s*/;
const UNRESOLVABLE_PROTOCOL_VERSION = /^(?:file|git|github|https?|link|patch|portal|workspace|npm):/i;
const DIST_TAG_VERSION = /^[a-z][a-z0-9._-]*$/i;
const WILDCARD_VERSION = /^[*xX](?:\.[*xX])*$/;
const NON_LOWER_BOUND_COMPARATOR = /(?:^|[\s,|])(?:>(?!=)|!={0,2})\s*\d/;
const LOWER_BOUND_MAJOR = /(?:^|[\s,|])(?:>=\s*|[~^=v]\s*)?(\d+)(?=$|[\s,|.*xX-])/g;

const getBranchLowestMajor = (branch: string): number | null => {
  if (NON_LOWER_BOUND_COMPARATOR.test(branch)) return null;

  const lowerBoundComparators = branch.replace(UPPER_BOUND_COMPARATOR, " ").trim();
  if (lowerBoundComparators.length === 0) return null;

  let branchLowestMajor: number | null = null;
  for (const match of lowerBoundComparators.matchAll(LOWER_BOUND_MAJOR)) {
    const major = Number.parseInt(match[1], 10);
    if (!Number.isFinite(major) || major <= 0) continue;
    if (branchLowestMajor === null || major < branchLowestMajor) branchLowestMajor = major;
  }

  return branchLowestMajor;
};

export const parseReactMajor = (reactVersion: string | null | undefined): number | null => {
  if (typeof reactVersion !== "string") return null;
  const trimmed = reactVersion.trim();
  if (trimmed.length === 0) return null;
  if (UNRESOLVABLE_PROTOCOL_VERSION.test(trimmed)) return null;
  if (DIST_TAG_VERSION.test(trimmed) && !/^v\d/i.test(trimmed)) return null;
  if (WILDCARD_VERSION.test(trimmed)) return null;

  let lowestMajor: number | null = null;
  for (const branch of trimmed.split(OR_SEPARATOR).filter(Boolean)) {
    if (UNRESOLVABLE_PROTOCOL_VERSION.test(branch.trim())) return null;
    const branchLowestMajor = getBranchLowestMajor(branch);
    if (branchLowestMajor === null && HAS_UPPER_BOUND_COMPARATOR.test(branch)) return null;
    if (branchLowestMajor !== null && (lowestMajor === null || branchLowestMajor < lowestMajor)) {
      lowestMajor = branchLowestMajor;
    }
  }

  return lowestMajor;
};
