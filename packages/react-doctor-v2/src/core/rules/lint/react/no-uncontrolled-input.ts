import { defineRule } from "../../registry.js";
import {
  UNCONTROLLED_INPUT_TAGS,
  VALUE_BYPASS_INPUT_TYPES,
  VALUE_PARTNER_ATTRIBUTES,
  collectUndefinedInitialStateNames,
  findJsxAttribute,
  getInputTypeLiteral,
  hasJsxSpreadAttribute,
  isComponentAssignment,
  isUppercaseName,
  walkAst,
  isNodeOfType,
} from "./_utils.js";
import type { EsTreeNode, Rule, RuleContext } from "./_utils.js";

export const noUncontrolledInput = defineRule<Rule>({
  recommendation:
    "Choose controlled inputs with value/onChange or uncontrolled inputs with defaultValue, but do not mix the two modes.",
  examples: [
    {
      before: `<input value={value} defaultValue="A" />`,
      after: `<input value={value} onChange={setValue} />`,
    },
  ],
  create: (context: RuleContext) => {
    const checkComponent = (componentBody: EsTreeNode | null | undefined): void => {
      if (!componentBody) return;
      // Concise arrow bodies (`() => <input ... />`) skip the BlockStatement
      // wrapper; walk the JSX expression directly. There are no useState
      // declarations to collect for the undefined-initializer check, so an
      // empty set is correct.
      const undefinedInitialStateNames = isNodeOfType(componentBody, "BlockStatement")
        ? collectUndefinedInitialStateNames(componentBody)
        : new Set<string>();

      walkAst(componentBody, (child: EsTreeNode) => {
        if (!isNodeOfType(child, "JSXOpeningElement")) return;
        if (!isNodeOfType(child.name, "JSXIdentifier")) return;
        const tagName = child.name.name;
        if (!UNCONTROLLED_INPUT_TAGS.has(tagName)) return;

        const attributes = child.attributes ?? [];
        if (hasJsxSpreadAttribute(attributes)) return;

        const valueAttribute = findJsxAttribute(attributes, "value");
        if (!valueAttribute) return;

        if (tagName === "input") {
          const inputType = getInputTypeLiteral(attributes);
          if (inputType !== null && VALUE_BYPASS_INPUT_TYPES.has(inputType)) return;
        }

        const hasAllowedPartner = VALUE_PARTNER_ATTRIBUTES.some((partnerAttributeName) =>
          findJsxAttribute(attributes, partnerAttributeName),
        );

        if (
          isNodeOfType(valueAttribute.value, "JSXExpressionContainer") &&
          isNodeOfType(valueAttribute.value.expression, "Identifier") &&
          undefinedInitialStateNames.has(valueAttribute.value.expression.name)
        ) {
          const stateName = valueAttribute.value.expression.name;
          const partnerHint = hasAllowedPartner
            ? "Initialize useState with an explicit value"
            : "Initialize useState with an explicit value AND add onChange (or readOnly)";
          context.report({
            node: child,
            message: `<${tagName} value={${stateName}}> - "${stateName}" is initialized as undefined (uncontrolled), then becomes controlled on first set; React warns about this flip. ${partnerHint} (e.g. \`useState("")\`)`,
          });
          return;
        }

        if (findJsxAttribute(attributes, "defaultValue")) {
          context.report({
            node: child,
            message: `<${tagName}> sets both \`value\` and \`defaultValue\` - defaultValue is ignored on a controlled input; remove one`,
          });
          return;
        }

        if (!hasAllowedPartner) {
          context.report({
            node: child,
            message: `<${tagName} value={...}> with no \`onChange\` or \`readOnly\` - React renders this as a silently read-only field`,
          });
        }
      });
    };

    return {
      FunctionDeclaration(node: EsTreeNode) {
        if (!node.id?.name || !isUppercaseName(node.id.name)) return;
        checkComponent(node.body);
      },
      VariableDeclarator(node: EsTreeNode) {
        if (!isComponentAssignment(node)) return;
        checkComponent(node.init?.body);
      },
    };
  },
});
