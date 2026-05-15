// HACK: extracts the lowest concrete React major from a peer-dependency
// range. Used to compute the effective React version for libraries:
// a library with `"react": "^17 || ^18 || ^19"` has an effective major
// of 17, so version-gated rules that require React 19+ are suppressed.
const COMPARATOR_SEPARATOR = /[\s,|]+/;
const OR_SEPARATOR = /\s*\|\|\s*/;
const HAS_UPPER_BOUND_COMPARATOR = /<\s*=?\s*\d+(?:\.\d+){0,2}(?:-[^\s,|]+)?/;
const UPPER_BOUND_COMPARATOR = /<\s*=?\s*\d+(?:\.\d+){0,2}(?:-[^\s,|]+)?/g;
const UNRESOLVABLE_PROTOCOL_VERSION =
  /^(?:file|git|github|https?|link|patch|portal|workspace|npm):/i;
const DIST_TAG_VERSION = /^[a-z][a-z0-9._-]*$/i;
const NON_LOWER_BOUND_COMPARATOR = /^(?:>(?!=)|!={0,2})\s*\d/;
const WILDCARD_COMPARATOR = /^[*xX](?:\.[*xX])*$/;
const NPM_ALIAS_VERSION = /^npm:(?:@[^/]+\/[^@]+|[^@]+)@(.+)$/i;

const extractComparatorMajor = (comparator: string): number | null => {
  const npmAliasMatch = comparator.match(NPM_ALIAS_VERSION);
  const normalizedComparator = npmAliasMatch?.[1]?.trim() ?? comparator;
  if (UNRESOLVABLE_PROTOCOL_VERSION.test(normalizedComparator)) return null;
  if (DIST_TAG_VERSION.test(normalizedComparator) && !/^v\d/i.test(normalizedComparator))
    return null;
  if (WILDCARD_COMPARATOR.test(normalizedComparator)) return null;
  if (NON_LOWER_BOUND_COMPARATOR.test(normalizedComparator)) return null;
  const firstIntegerMatch = normalizedComparator.match(/^(?:>=\s*|[~^=v]\s*)?(\d+)(?=$|[.*xX-])/);
  if (!firstIntegerMatch) return null;
  const major = Number.parseInt(firstIntegerMatch[1], 10);
  return major >= 1 ? major : null;
};

const getBranchLowestMajor = (branch: string): number | null => {
  const lowerBoundComparators = branch.replace(UPPER_BOUND_COMPARATOR, " ");
  let branchLowestMajor: number | null = null;
  for (const comparator of lowerBoundComparators
    .trim()
    .split(COMPARATOR_SEPARATOR)
    .filter(Boolean)) {
    const major = extractComparatorMajor(comparator);
    if (major !== null && (branchLowestMajor === null || major < branchLowestMajor)) {
      branchLowestMajor = major;
    }
  }
  return branchLowestMajor;
};

export const hasUpperBoundOnlyPeerRange = (range: string | null | undefined): boolean => {
  if (typeof range !== "string") return false;
  return range
    .trim()
    .split(OR_SEPARATOR)
    .filter(Boolean)
    .some(
      (branch) => getBranchLowestMajor(branch) === null && HAS_UPPER_BOUND_COMPARATOR.test(branch),
    );
};

export const peerRangeMinMajor = (range: string | null | undefined): number | null => {
  if (typeof range !== "string") return null;
  let lowestMajor: number | null = null;
  for (const branch of range.trim().split(OR_SEPARATOR).filter(Boolean)) {
    const branchLowestMajor = getBranchLowestMajor(branch);
    if (branchLowestMajor === null && HAS_UPPER_BOUND_COMPARATOR.test(branch)) {
      return null;
    }
    if (branchLowestMajor !== null && (lowestMajor === null || branchLowestMajor < lowestMajor)) {
      lowestMajor = branchLowestMajor;
    }
  }
  return lowestMajor;
};
