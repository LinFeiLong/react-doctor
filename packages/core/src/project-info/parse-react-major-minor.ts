// HACK: react-doctor reads the project's React version straight out of
// package.json (the `react` dep), which produces semver ranges
// (`^19.2.0`, `~19.0.1`, `>=19 <20`, `19.x`, `latest`, etc.) — never a
// normalized number. Some React-version-gated rules need the MINOR in
// addition to the major (e.g. `<Activity>` shipped in React 19.2 — a
// gate purely on `major >= 19` would mis-fire on 19.0 / 19.1).
//
// Mirrors `parse-tailwind-major-minor` exactly: pull the first
// `<major>.<minor>` pair from the trimmed spec, fall back to
// `{ major, minor: 0 }` when only a major is present.
interface ReactMajorMinor {
  major: number;
  minor: number;
}

export const parseReactMajorMinor = (
  reactVersion: string | null | undefined,
): ReactMajorMinor | null => {
  if (typeof reactVersion !== "string") return null;
  const trimmed = reactVersion.trim();
  if (trimmed.length === 0) return null;

  const majorMinorMatch = trimmed.match(/(\d+)\.(\d+)/);
  if (majorMinorMatch) {
    const major = Number.parseInt(majorMinorMatch[1], 10);
    const minor = Number.parseInt(majorMinorMatch[2], 10);
    if (!Number.isFinite(major) || major <= 0) return null;
    if (!Number.isFinite(minor) || minor < 0) return null;
    return { major, minor };
  }

  const majorOnlyMatch = trimmed.match(/(\d+)/);
  if (!majorOnlyMatch) return null;
  const major = Number.parseInt(majorOnlyMatch[1], 10);
  if (!Number.isFinite(major) || major <= 0) return null;
  return { major, minor: 0 };
};

export const isReactAtLeast = (
  detected: ReactMajorMinor | null,
  required: ReactMajorMinor,
): boolean => {
  // HACK: when detection failed (workspace protocols, dist-tags like
  // "latest", etc.) optimistically treat the project as running the
  // latest React so we surface the rule rather than silently dropping
  // it. Mirrors the React-major and Tailwind fallback policy.
  if (detected === null) return true;
  if (detected.major !== required.major) return detected.major > required.major;
  return detected.minor >= required.minor;
};
