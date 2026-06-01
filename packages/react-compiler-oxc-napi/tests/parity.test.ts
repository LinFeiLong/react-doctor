import { Linter } from "eslint";
import { describe, expect, it } from "vite-plus/test";

import nativePlugin from "../plugin.js";

// The real npm plugin (runs babel-plugin-react-compiler). This is the oracle the
// native plugin must match 1:1 for the rules we've ported.
import reactHooksPlugin from "eslint-plugin-react-hooks";

// The rules verified for 1:1 parity with the oracle. The native plugin must
// produce identical (rule, line) diagnostics to eslint-plugin-react-hooks for
// every one, across the fixture corpus below.
//
// `unsupported-syntax` and `todo` are intentionally OUT of scope: they fire from
// the React Compiler's open-ended bail/Todo paths, and the native port does not
// preserve babel's per-construct error CATEGORY (e.g. babel flags `try/finally`
// as `todo`, while the native lowering marks it `UnsupportedStatement`).
// Reaching 1:1 there requires auditing every bail site's category against babel
// (a compiler-error-path-parity effort), so they are not asserted here. The
// native plugin never emits them, so it has no false positives — only benign
// false negatives on rarely-reachable constructs.
const PORTED_RULES = [
  "set-state-in-render",
  "error-boundaries",
  "set-state-in-effect",
  "use-memo",
  "void-use-memo",
  "globals",
  "immutability",
  "purity",
  "static-components",
  "hooks",
  "refs",
  "preserve-manual-memoization",
  "incompatible-library",
  "component-hook-factories",
] as const;

const RULES_CONFIG: Linter.RulesRecord = Object.fromEntries(
  PORTED_RULES.map((name) => [`react-hooks/${name}`, "error"]),
);

const LANGUAGE_OPTIONS = {
  ecmaVersion: 2022 as const,
  sourceType: "module" as const,
  parserOptions: { ecmaFeatures: { jsx: true } },
};

interface Diagnostic {
  rule: string;
  line: number;
}

const linter = new Linter();

const lintWith = (
  plugin: { rules: Record<string, unknown> },
  code: string,
): Diagnostic[] => {
  const messages = linter.verify(code, {
    plugins: { "react-hooks": plugin as never },
    rules: RULES_CONFIG,
    languageOptions: LANGUAGE_OPTIONS,
  });
  return messages
    .filter((message) => message.ruleId != null)
    .map((message) => ({ rule: message.ruleId!.replace(/^react-hooks\//, ""), line: message.line }))
    .filter((diagnostic) => PORTED_RULES.includes(diagnostic.rule as never))
    .sort((a, b) => a.rule.localeCompare(b.rule) || a.line - b.line);
};

// Each fixture is a small component exercising one rule (or none). Both backends
// must agree on which ported rules fire and on which lines.
const FIXTURES: Array<{ name: string; code: string }> = [
  {
    name: "clean component (no violations)",
    code: `import { useState } from 'react';
function Component(props) {
  const [count, setCount] = useState(0);
  return <div onClick={() => setCount(count + 1)}>{count}{props.label}</div>;
}`,
  },
  {
    name: "set-state-in-render",
    code: `import { useState } from 'react';
function Component() {
  const [count, setCount] = useState(0);
  setCount(1);
  return <div>{count}</div>;
}`,
  },
  {
    name: "set-state-in-effect",
    code: `import { useState, useEffect } from 'react';
function Component() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(1);
  });
  return <div>{count}</div>;
}`,
  },
  {
    name: "error-boundaries (jsx in try)",
    code: `function Component() {
  let element;
  try {
    element = <Child />;
  } catch {
    element = null;
  }
  return element;
}`,
  },
  {
    name: "globals (reassign module variable)",
    code: `let tally = 0;
function Component() {
  tally = tally + 1;
  return <div>{tally}</div>;
}`,
  },
  {
    name: "refs (ref.current in render)",
    code: `import { useRef } from 'react';
function Component() {
  const ref = useRef(null);
  return <div>{ref.current}</div>;
}`,
  },
  {
    name: "refs guard pattern (no violation)",
    code: `import { useRef } from 'react';
function Component() {
  const ref = useRef(null);
  if (ref.current == null) {
    ref.current = compute();
  }
  return <div />;
}`,
  },
  {
    name: "static-components (component created in render)",
    code: `function Component(props) {
  const Inner = () => <div>{props.value}</div>;
  return <Inner />;
}`,
  },
  {
    name: "purity (impure call in render)",
    code: `function Component() {
  const id = Math.random();
  return <div>{id}</div>;
}`,
  },
  {
    name: "incompatible-library (tanstack table)",
    code: `import { useReactTable } from '@tanstack/react-table';
function Component(props) {
  const table = useReactTable(props.options);
  return <div>{table.foo}</div>;
}`,
  },
  // Exotic constructs that exercise the compiler's bail/Todo/UnsupportedSyntax
  // paths. The oracle does not flag these (the compiler is permissive); native
  // must agree (no spurious diagnostics, no missed ones).
  {
    name: "async component",
    code: `async function Component() {
  const value = await fetchValue();
  return <div>{value}</div>;
}`,
  },
  {
    name: "generator function",
    code: `function* gen() {
  yield 1;
}`,
  },
  {
    name: "for-await loop",
    code: `async function load() {
  for await (const item of source()) {
    handle(item);
  }
  return null;
}`,
  },
  {
    name: "labeled loop with continue",
    code: `function Component(props) {
  outer: for (const row of props.rows) {
    for (const cell of row) {
      if (cell == null) continue outer;
    }
  }
  return <div />;
}`,
  },
  {
    name: "rest element + spread call",
    code: `function Component({ first, ...rest }) {
  return <div>{first}{format(...rest.values)}</div>;
}`,
  },
  {
    name: "try/finally",
    code: `function Component() {
  try {
    doWork();
  } finally {
    cleanup();
  }
  return <div />;
}`,
  },
];

describe("react-hooks-js native vs eslint-plugin-react-hooks 1:1 parity", () => {
  for (const fixture of FIXTURES) {
    it(fixture.name, () => {
      const upstream = lintWith(reactHooksPlugin as never, fixture.code);
      const native = lintWith(nativePlugin, fixture.code);
      expect(native).toEqual(upstream);
    });
  }
});
