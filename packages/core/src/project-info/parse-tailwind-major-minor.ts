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

// Bounded quantifiers (mirroring parse-react-major-minor.ts) keep the
// unanchored scan linear: `(\d+)\.` backtracks quadratically on long
// digit runs, and the version string comes straight from package.json.
const MAJOR_MINOR_PATTERN = /(\d{1,4})\.(\d{1,4})/;
const MAJOR_ONLY_PATTERN = /(\d{1,4})/;

export const parseTailwindMajorMinor = (
  tailwindVersion: string | null | undefined,
): TailwindMajorMinor | null => {
  if (typeof tailwindVersion !== "string") return null;
  const trimmed = tailwindVersion.trim();
  if (trimmed.length === 0) return null;

  const majorMinorMatch = trimmed.match(MAJOR_MINOR_PATTERN);
  if (majorMinorMatch) {
    const major = Number.parseInt(majorMinorMatch[1], 10);
    const minor = Number.parseInt(majorMinorMatch[2], 10);
    if (!Number.isFinite(major) || major <= 0) return null;
    if (!Number.isFinite(minor) || minor < 0) return null;
    return { major, minor };
  }

  const majorOnlyMatch = trimmed.match(MAJOR_ONLY_PATTERN);
  if (!majorOnlyMatch) return null;
  const major = Number.parseInt(majorOnlyMatch[1], 10);
  if (!Number.isFinite(major) || major <= 0) return null;
  return { major, minor: 0 };
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
