import { REACT_DOCTOR_CUSTOM_OXLINT_RULES } from "./config.js";
import { reactDoctorOxlintRules } from "./rules.js";
import type { OxlintRuleSeverityMap } from "./config.js";
import type { ReactDoctorRuleMetadata } from "../types.js";

export interface OxlintRuleMetadata extends ReactDoctorRuleMetadata {
  oxlintRuleName: string;
  oxlintRuleKey: string;
}

export const REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE = "react-doctor";
export const REACT_DOCTOR_OXLINT_RULE_ID_PREFIX = "oxlint/react-doctor/";

const RULE_TITLE_WORD_UPPERCASE = /\b(css|html|url|svg|jsx|api|ua|rn)\b/gi;

const toRuleDisplayName = (ruleName: string): string => {
  const readable = ruleName
    .replace(/^(no|prefer|require|use)-/, "")
    .replace(
      /^(nextjs|tanstack-start|tanstack-query|rn|js|server|client|query|effect|design|rendering|rerender|react-compiler|advanced)-/,
      "",
    )
    .replaceAll("-", " ");
  const titled = readable.charAt(0).toUpperCase() + readable.slice(1);
  return titled.replace(RULE_TITLE_WORD_UPPERCASE, (match) => match.toUpperCase());
};

const REACT_DOCTOR_RULE_CATEGORY_MAP: Record<string, string> = {
  "no-derived-state-effect": "State & Effects",
  "no-fetch-in-effect": "State & Effects",
  "no-mirror-prop-effect": "State & Effects",
  "no-mutable-in-deps": "State & Effects",
  "no-cascading-set-state": "State & Effects",
  "no-effect-chain": "State & Effects",
  "no-effect-event-handler": "State & Effects",
  "no-effect-event-in-deps": "State & Effects",
  "no-event-trigger-state": "State & Effects",
  "no-prop-callback-in-effect": "State & Effects",
  "no-derived-useState": "State & Effects",
  "no-direct-state-mutation": "State & Effects",
  "no-set-state-in-render": "State & Effects",
  "prefer-use-effect-event": "State & Effects",
  "prefer-useReducer": "State & Effects",
  "prefer-use-sync-external-store": "State & Effects",
  "rerender-lazy-state-init": "Performance",
  "rerender-functional-setstate": "Performance",
  "rerender-dependencies": "State & Effects",
  "rerender-state-only-in-handlers": "Performance",
  "rerender-defer-reads-hook": "Performance",
  "advanced-event-handler-refs": "Performance",
  "effect-needs-cleanup": "State & Effects",
  "no-generic-handler-names": "Architecture",
  "no-giant-component": "Architecture",
  "no-many-boolean-props": "Architecture",
  "no-react19-deprecated-apis": "Architecture",
  "no-render-prop-children": "Architecture",
  "no-render-in-render": "Architecture",
  "no-nested-component-definition": "Correctness",
  "react-compiler-destructure-method": "Architecture",
  "no-legacy-class-lifecycles": "Correctness",
  "no-legacy-context-api": "Correctness",
  "no-default-props": "Architecture",
  "no-react-dom-deprecated-apis": "Architecture",
  "no-usememo-simple-expression": "Performance",
  "no-layout-property-animation": "Performance",
  "rerender-memo-with-default-value": "Performance",
  "rerender-memo-before-early-return": "Performance",
  "rerender-transitions-scroll": "Performance",
  "rerender-derived-state-from-hook": "Performance",
  "async-defer-await": "Performance",
  "async-await-in-loop": "Performance",
  "rendering-animate-svg-wrapper": "Performance",
  "rendering-hoist-jsx": "Performance",
  "rendering-hydration-mismatch-time": "Correctness",
  "rendering-usetransition-loading": "Performance",
  "rendering-hydration-no-flicker": "Performance",
  "rendering-script-defer-async": "Performance",
  "no-inline-prop-on-memo-component": "Performance",
  "no-transition-all": "Performance",
  "no-global-css-variable-animation": "Performance",
  "no-large-animated-blur": "Performance",
  "no-scale-from-zero": "Performance",
  "no-permanent-will-change": "Performance",
  "no-secrets-in-client-code": "Security",
  "no-barrel-import": "Bundle Size",
  "no-dynamic-import-path": "Bundle Size",
  "no-full-lodash-import": "Bundle Size",
  "no-moment": "Bundle Size",
  "prefer-dynamic-import": "Bundle Size",
  "use-lazy-motion": "Bundle Size",
  "no-undeferred-third-party": "Bundle Size",
  "no-array-index-as-key": "Correctness",
  "no-polymorphic-children": "Architecture",
  "rendering-conditional-render": "Correctness",
  "rendering-svg-precision": "Performance",
  "no-prevent-default": "Correctness",
  "no-uncontrolled-input": "Correctness",
  "no-document-start-view-transition": "Correctness",
  "no-flush-sync": "Performance",
  "no-justified-text": "Accessibility",
  "no-tiny-text": "Accessibility",
  "no-gray-on-colored-background": "Accessibility",
  "no-disabled-zoom": "Accessibility",
  "no-outline-none": "Accessibility",
  "design-no-vague-button-label": "Accessibility",
  "no-inline-bounce-easing": "Performance",
  "no-z-index-9999": "Architecture",
  "no-inline-exhaustive-style": "Architecture",
  "no-side-tab-border": "Architecture",
  "no-pure-black-background": "Architecture",
  "no-gradient-text": "Architecture",
  "no-dark-mode-glow": "Architecture",
  "no-wide-letter-spacing": "Architecture",
  "no-layout-transition-inline": "Performance",
  "no-long-transition-duration": "Performance",
  "design-no-bold-heading": "Architecture",
  "design-no-redundant-padding-axes": "Architecture",
  "design-no-redundant-size-axes": "Architecture",
  "design-no-space-on-flex-children": "Architecture",
  "design-no-three-period-ellipsis": "Architecture",
  "design-no-default-tailwind-palette": "Architecture",
  "js-flatmap-filter": "Performance",
  "js-combine-iterations": "Performance",
  "js-tosorted-immutable": "Performance",
  "js-hoist-regexp": "Performance",
  "js-hoist-intl": "Performance",
  "js-cache-property-access": "Performance",
  "js-length-check-first": "Performance",
  "js-min-max-loop": "Performance",
  "js-set-map-lookups": "Performance",
  "js-batch-dom-css": "Performance",
  "js-index-maps": "Performance",
  "js-cache-storage": "Performance",
  "js-early-exit": "Performance",
  "no-eval": "Security",
  "async-parallel": "Performance",
  "client-passive-event-listeners": "Performance",
  "client-localstorage-no-version": "Correctness",
  "query-stable-query-client": "TanStack Query",
  "query-no-rest-destructuring": "TanStack Query",
  "query-no-void-query-fn": "TanStack Query",
  "query-no-query-in-effect": "TanStack Query",
  "query-mutation-missing-invalidation": "TanStack Query",
  "query-no-usequery-for-mutation": "TanStack Query",
  "server-auth-actions": "Server",
  "server-after-nonblocking": "Server",
  "server-no-mutable-module-state": "Server",
  "server-cache-with-object-literal": "Server",
  "server-hoist-static-io": "Server",
  "server-dedup-props": "Server",
  "server-sequential-independent-await": "Server",
  "server-fetch-without-revalidate": "Server",
  "nextjs-no-side-effect-in-get-handler": "Security",
  "tanstack-start-no-secrets-in-loader": "Security",
  "tanstack-start-get-mutation": "Security",
  "tanstack-start-loader-parallel-fetch": "Performance",
};

const resolveReactDoctorRuleCategory = (ruleName: string): string => {
  const mapped = REACT_DOCTOR_RULE_CATEGORY_MAP[ruleName];
  if (mapped) return mapped;
  if (ruleName.startsWith("nextjs-")) return "Next.js";
  if (ruleName.startsWith("rn-")) return "React Native";
  if (ruleName.startsWith("tanstack-start-")) return "TanStack Start";
  if (ruleName.startsWith("tanstack-query-") || ruleName.startsWith("query-")) {
    return "TanStack Query";
  }
  if (ruleName.startsWith("server-")) return "Server";
  if (ruleName.startsWith("js-")) return "Performance";
  if (ruleName.startsWith("design-")) return "Architecture";
  if (ruleName.startsWith("rendering-") || ruleName.startsWith("rerender-")) return "Performance";
  return "Other";
};

const toReactDoctorSeverity = (
  severity: OxlintRuleSeverityMap[string],
): ReactDoctorRuleMetadata["severity"] => {
  if (severity === "error") return "error";
  if (severity === "off") return "info";
  return "warning";
};

export const reactDoctorOxlintRuleMetadata: OxlintRuleMetadata[] = Object.entries(
  reactDoctorOxlintRules,
)
  .sort(([ruleName], [nextRuleName]) => ruleName.localeCompare(nextRuleName))
  .map(([ruleName, rule]) => {
    const oxlintRuleKey = `${REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE}/${ruleName}`;
    const severity = REACT_DOCTOR_CUSTOM_OXLINT_RULES[oxlintRuleKey] ?? "warn";

    return {
      id: `${REACT_DOCTOR_OXLINT_RULE_ID_PREFIX}${ruleName}`,
      name: toRuleDisplayName(ruleName),
      description: `Runs the ${oxlintRuleKey} custom oxlint rule.`,
      recommendation: rule.recommendation,
      examples: rule.examples,
      category: resolveReactDoctorRuleCategory(ruleName),
      severity: toReactDoctorSeverity(severity),
      defaultEnabled: false,
      tags: ["oxlint", "custom", REACT_DOCTOR_OXLINT_PLUGIN_NAMESPACE],
      oxlintRuleName: ruleName,
      oxlintRuleKey,
    };
  });
