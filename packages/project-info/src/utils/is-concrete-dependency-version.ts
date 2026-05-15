const DIST_TAG_VERSION = /^[a-z][a-z0-9._-]*$/i;
const UNRESOLVABLE_PROTOCOL_VERSION = /^(?:file|git|github|https?|link|patch|portal|workspace):/;
const WILDCARD_VERSION = /^[*xX](?:\.[*xX])*$/;

export const isConcreteDependencyVersion = (version: string): boolean => {
  const trimmed = version.trim();
  if (trimmed.length === 0) return false;
  if (DIST_TAG_VERSION.test(trimmed)) return false;
  if (UNRESOLVABLE_PROTOCOL_VERSION.test(trimmed)) return false;
  if (WILDCARD_VERSION.test(trimmed)) return false;
  return /\d/.test(trimmed);
};
