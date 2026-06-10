import { AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const AGENT_TOOL_DEFINITION_PATTERN =
  /\b(?:tool\s*\(\s*\{|createTool\s*\(|defineTool\s*\(|new\s+(?:DynamicTool|StructuredTool)\s*\()/;

const AGENT_TOOL_CONTEXT_PATH_PATTERN =
  /(?:^|\/)(?:agents?|tools?|mcp)(?:\/|$)|(?:agent|tool|mcp)[^/]*\.[cm]?[jt]sx?$/i;

export const agentToolCapabilityRisk = defineRule({
  id: "agent-tool-capability-risk",
  title: "Agent tool exposes dangerous capability",
  severity: "warn",
  recommendation:
    "Treat tool inputs as prompt-injection controlled. Validate arguments, scope permissions per call, and avoid exposing shell/file/network primitives directly to agents.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    if (!AGENT_TOOL_CONTEXT_PATH_PATTERN.test(file.relativePath)) return [];
    if (!AGENT_TOOL_DEFINITION_PATTERN.test(file.content)) return [];
    if (!AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN.test(file.content)) return [];

    const location = getMatchLocation(file.content, AGENT_TOOL_DEFINITION_PATTERN);
    return [
      {
        message:
          "An agent-callable tool appears to expose network, filesystem, shell, or code-execution capability.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
