import * as semver from "semver";

// HACK: react-doctor reads the project's Tailwind version straight out
// of package.json (the `tailwindcss` dep), which produces semver ranges
// (`^3.4.1`, `~3.3.0`, `>=3 <5`, `4.x`, `latest`, etc.) — never a
// normalized number. Some Tailwind-version-gated rules need the MINOR
// in addition to the major (e.g. the `size-N` shorthand only landed in
// Tailwind v3.4 — gating purely on `major >= 3` would mis-fire on
// v3.0 … v3.3 codebases).
interface TailwindMajorMinor {
  major: number;
  minor: number;
}

// Lower bound of a range (`>=3.4 <5` → 3.4.0), with `coerce` as the
// fallback for non-range specs that still embed a version
// (`npm:tailwindcss@^3.4.1`). Tags (`latest`, `next`) resolve to null.
const parseLowerBoundVersion = (versionSpec: string): semver.SemVer | null =>
  semver.validRange(versionSpec) !== null
    ? semver.minVersion(versionSpec)
    : semver.coerce(versionSpec);

export const parseTailwindMajorMinor = (
  tailwindVersion: string | null | undefined,
): TailwindMajorMinor | null => {
  if (typeof tailwindVersion !== "string") return null;
  const trimmed = tailwindVersion.trim();
  if (trimmed.length === 0) return null;

  const lowerBound = parseLowerBoundVersion(trimmed);
  if (lowerBound === null || lowerBound.major <= 0) return null;
  return { major: lowerBound.major, minor: lowerBound.minor };
};

export const isTailwindAtLeast = (
  detected: TailwindMajorMinor | null,
  required: TailwindMajorMinor,
): boolean => {
  // HACK: when detection failed, optimistically treat the project as
  // running the latest Tailwind so we surface the rule rather than
  // silently dropping it. Mirrors the React-major fallback policy.
  if (detected === null) return true;
  if (detected.major !== required.major) return detected.major > required.major;
  return detected.minor >= required.minor;
};
