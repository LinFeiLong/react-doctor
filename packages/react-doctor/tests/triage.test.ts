import { describe, expect, it } from "vite-plus/test";
import type { Diagnostic } from "@react-doctor/core";
import { __testing } from "../src/cli/utils/triage.js";

const { buildUserPrompt, parseTriageTags, resolveDiagnosticForTag } = __testing;

const ROOT_DIRECTORY = "/tmp/project";

const buildDiagnostic = (overrides: Partial<Diagnostic> = {}): Diagnostic => ({
  filePath: `${ROOT_DIRECTORY}/src/hooks/use-user.ts`,
  plugin: "react-doctor",
  rule: "no-fetch-in-effect",
  severity: "error",
  message: "Effects that fetch data must abort in cleanup.",
  help: "Scope an AbortController to the effect.",
  url: "https://react.dev/learn",
  line: 18,
  column: 5,
  category: "state-and-effects",
  ...overrides,
});

describe("triage user prompt", () => {
  it("includes every diagnostic with rule, file, and message", () => {
    const diagnosticsForPrompt = [
      buildDiagnostic({ line: 18 }),
      buildDiagnostic({
        filePath: `${ROOT_DIRECTORY}/src/components/list.tsx`,
        rule: "no-array-index-as-key",
        line: 42,
        message: "Avoid array index as React key.",
      }),
    ];

    const promptText = buildUserPrompt(diagnosticsForPrompt, ROOT_DIRECTORY);

    expect(promptText).toContain("react-doctor/no-fetch-in-effect");
    expect(promptText).toContain("src/hooks/use-user.ts:18");
    expect(promptText).toContain("react-doctor/no-array-index-as-key");
    expect(promptText).toContain("src/components/list.tsx:42");
    expect(promptText).toContain("Total diagnostics: 2");
    expect(promptText).toContain("omission is the suppression mechanism");
  });

  it("collapses multi-line diagnostic messages onto a single line", () => {
    const promptText = buildUserPrompt(
      [buildDiagnostic({ message: "First line.\n  Second line.\n\nThird." })],
      ROOT_DIRECTORY,
    );

    expect(promptText).toContain("message: First line. Second line. Third.");
    expect(promptText).not.toMatch(/message: First line\.\n/);
  });
});

describe("triage tag parsing", () => {
  it("parses a valid triage tag with all attributes", () => {
    const responseText = `<triage priority="P0" rule="react-doctor/no-fetch-in-effect" file="src/hooks/use-user.ts" line="18" title="Fetch leaks on rapid prop change">
Effect never aborts when userId changes mid-flight.
</triage>`;

    const parsedTags = parseTriageTags(responseText);

    expect(parsedTags).toHaveLength(1);
    const [parsedTag] = parsedTags;
    expect(parsedTag.priority).toBe("P0");
    expect(parsedTag.ruleKey).toBe("react-doctor/no-fetch-in-effect");
    expect(parsedTag.filePath).toBe("src/hooks/use-user.ts");
    expect(parsedTag.line).toBe(18);
    expect(parsedTag.title).toBe("Fetch leaks on rapid prop change");
    expect(parsedTag.description).toBe("Effect never aborts when userId changes mid-flight.");
  });

  it("decodes XML entities in attribute values and body", () => {
    const responseText = `<triage priority="P1" rule="react-doctor/no-bind" file="src/x.tsx" line="3" title="Inline &lt;Button&gt; bind">
The &amp; operator is misused; &quot;onClick&quot; binds a fresh function.
</triage>`;

    const [parsedTag] = parseTriageTags(responseText);

    expect(parsedTag.title).toBe("Inline <Button> bind");
    expect(parsedTag.description).toBe(
      'The & operator is misused; "onClick" binds a fresh function.',
    );
  });

  it("ignores tags missing required attributes", () => {
    const responseText = `
<triage priority="WHATEVER" rule="r" file="f" line="1" title="t">body</triage>
<triage priority="P0" rule="" file="f" line="1" title="t">body</triage>
<triage priority="P0" rule="r" file="" line="1" title="t">body</triage>
<triage priority="P0" rule="r" file="f" line="abc" title="t">body</triage>
<triage priority="P0" rule="r" file="f" line="0" title="t">body</triage>
<triage priority="P0" rule="r" file="f" line="1" title="">body</triage>
<triage priority="P0" rule="r" file="f" line="1" title="t"></triage>
`;

    const parsedTags = parseTriageTags(responseText);

    expect(parsedTags).toHaveLength(0);
  });

  it("parses multiple tags and preserves order", () => {
    const responseText = `
<triage priority="P0" rule="a/b" file="src/a.ts" line="1" title="A">a</triage>
some prose
<triage priority="P2" rule="c/d" file="src/c.ts" line="2" title="C">c</triage>
`;

    const parsedTags = parseTriageTags(responseText);

    expect(parsedTags).toHaveLength(2);
    expect(parsedTags[0].priority).toBe("P0");
    expect(parsedTags[1].priority).toBe("P2");
  });
});

describe("triage diagnostic matching", () => {
  const knownDiagnostics: Diagnostic[] = [buildDiagnostic({ line: 18 })];

  it("matches a tag back to a diagnostic via the relative file path", () => {
    const matchedDiagnostic = resolveDiagnosticForTag(
      {
        priority: "P0",
        ruleKey: "react-doctor/no-fetch-in-effect",
        filePath: "src/hooks/use-user.ts",
        line: 18,
        title: "t",
        description: "d",
      },
      knownDiagnostics,
      ROOT_DIRECTORY,
    );

    expect(matchedDiagnostic?.line).toBe(18);
  });

  it("matches a tag back to a diagnostic via the absolute file path", () => {
    const matchedDiagnostic = resolveDiagnosticForTag(
      {
        priority: "P0",
        ruleKey: "react-doctor/no-fetch-in-effect",
        filePath: `${ROOT_DIRECTORY}/src/hooks/use-user.ts`,
        line: 18,
        title: "t",
        description: "d",
      },
      knownDiagnostics,
      ROOT_DIRECTORY,
    );

    expect(matchedDiagnostic).not.toBeNull();
  });

  it("returns null when the rule/file/line do not match any diagnostic", () => {
    const noMatch = resolveDiagnosticForTag(
      {
        priority: "P0",
        ruleKey: "react-doctor/no-fetch-in-effect",
        filePath: "src/hooks/use-user.ts",
        line: 99,
        title: "t",
        description: "d",
      },
      knownDiagnostics,
      ROOT_DIRECTORY,
    );

    expect(noMatch).toBeNull();
  });
});
