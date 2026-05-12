import { defineRule } from "../../registry.js";
import {
  REACT_DOM_DEPRECATED_MESSAGES,
  createDeprecatedReactImportRule,
  reportTestUtilsImports,
} from "./_utils.js";
import type { Rule } from "./_utils.js";

export const noReactDomDeprecatedApis = defineRule<Rule>(
  createDeprecatedReactImportRule({
    recommendation:
      "Replace deprecated react-dom APIs with createRoot, hydrateRoot, root.unmount, React act, or Testing Library helpers.",
    examples: [
      {
        before: `ReactDOM.render(<App />, root);`,
        after: `createRoot(root).render(<App />);`,
      },
    ],
    source: "react-dom",
    messages: REACT_DOM_DEPRECATED_MESSAGES,
    handleExtraSource: (node, context) => {
      if (node.source?.value !== "react-dom/test-utils") return false;
      reportTestUtilsImports(node, context);
      return true;
    },
  }),
);
