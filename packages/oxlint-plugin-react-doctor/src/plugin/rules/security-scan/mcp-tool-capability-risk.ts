import { AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const MCP_IMPORT_PATTERN =
  /\bfrom\s+["']@modelcontextprotocol\/sdk[^"']*["']|\bMcpServer\b|\bMcpAgent\b/;

const MCP_TOOL_SURFACE_PATTERN =
  /\b(?:server\.\s*(?:tool|resource|prompt)\s*\(|register(?:Tool|Resource|Prompt)\s*\(|setRequestHandler\s*\(\s*(?:CallToolRequestSchema|ListToolsRequestSchema)|new\s+(?:McpServer|McpAgent)\s*\()/;

export const mcpToolCapabilityRisk = defineRule({
  id: "mcp-tool-capability-risk",
  title: "MCP tool exposes dangerous capability",
  severity: "warn",
  recommendation:
    "MCP tool calls run with the connecting client's authority. Validate inputs, enforce per-tool authorization, and avoid raw filesystem/shell/network access where possible.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    if (!MCP_IMPORT_PATTERN.test(file.content)) return [];
    if (!MCP_TOOL_SURFACE_PATTERN.test(file.content)) return [];
    if (!AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN.test(file.content)) return [];

    const location = getMatchLocation(file.content, MCP_TOOL_SURFACE_PATTERN);
    return [
      {
        message:
          "An MCP tool/resource/prompt handler appears to expose file, shell, network, or code-execution capability.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
