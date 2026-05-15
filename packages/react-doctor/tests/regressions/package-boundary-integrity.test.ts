/**
 * Regression tests for the post-`@react-doctor/*`-extraction package
 * boundaries. These pin behavior that's easy to silently regress when
 * someone touches the workspace dependency graph or moves a constant
 * between packages.
 *
 * Covered:
 *   #249 — any name exported by BOTH `@react-doctor/project-info` and
 *          `@react-doctor/core` must be the SAME runtime reference
 *          (i.e. core re-exports it; it isn't re-declared).
 */

import { describe, expect, it } from "vite-plus/test";
import * as core from "@react-doctor/core";
import * as projectInfo from "@react-doctor/project-info";

// HACK: PR #249 (Bugbot review): SOURCE_FILE_PATTERN,
// GIT_LS_FILES_MAX_BUFFER_BYTES, and IGNORED_DIRECTORIES were
// re-declared with identical values in both `core/src/constants.ts`
// and `project-info/src/constants.ts`. Since `@react-doctor/core`
// already depends on `@react-doctor/project-info`, the duplication was
// pure drift risk — touching one copy and missing the other would
// silently fork behavior between scan stages that happened to import
// from the "wrong" package.
//
// Rather than hardcoding the three names Bugbot flagged (which would
// itself be a silent-drift surface — a 4th duplicate added tomorrow
// would slip past), this test auto-discovers every name exported by
// both packages at runtime and asserts reference equality for each
// one. Adding a new shared constant is then a zero-touch event for
// this test; *unifying* the divergent declaration is the only fix.
const collectSharedExportNames = (): string[] => {
  const projectInfoNames = new Set(Object.keys(projectInfo));
  return Object.keys(core)
    .filter((name) => projectInfoNames.has(name))
    .sort();
};

describe("shared exports between @react-doctor/core and @react-doctor/project-info (#249)", () => {
  const sharedExportNames = collectSharedExportNames();

  it("there is at least one shared runtime export to validate", () => {
    // HACK: tripwire for "did core stop depending on project-info
    // entirely?" or "did our barrel imports break?". If the boundary
    // is intentionally drained to zero shared names, delete this test.
    expect(sharedExportNames.length).toBeGreaterThan(0);
  });

  it("every shared export is the same runtime reference in both packages", () => {
    // HACK: a failure here means `core/src/constants.ts` re-declared a
    // constant instead of re-exporting it from
    // `@react-doctor/project-info` — fix the export, not the test.
    // Reference equality (`toBe`) is intentional: structural equality
    // (`.toEqual`) would mask the very drift this test is here to
    // catch (two RegExp objects with the same pattern aren't `.toBe`).
    const failures: string[] = [];
    for (const name of sharedExportNames) {
      const coreValue = Reflect.get(core, name);
      const projectInfoValue = Reflect.get(projectInfo, name);
      // Defensive: a `export type { X } from "..."` slip would leave
      // both lookups as `undefined`, and `undefined === undefined`
      // would let drift sneak past. Require runtime presence first.
      if (coreValue === undefined || projectInfoValue === undefined) {
        failures.push(
          `${name}: present at type-level only (core=${coreValue}, project-info=${projectInfoValue}) — use a value re-export`,
        );
        continue;
      }
      if (!Object.is(coreValue, projectInfoValue)) {
        failures.push(`${name}: core has its own copy — re-export from @react-doctor/project-info`);
      }
    }
    expect(failures).toEqual([]);
  });
});
