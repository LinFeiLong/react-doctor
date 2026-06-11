import { AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN } from "../../constants/security-scan.js";
import { defineRule } from "../../utils/define-rule.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";
import { scanByPattern } from "./utils/scan-by-pattern.js";

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
  scan: scanByPattern({
    shouldScan: (file) => isProductionSourcePath(file.relativePath),
    pattern: MCP_TOOL_SURFACE_PATTERN,
    requireAll: [MCP_IMPORT_PATTERN, AGENT_TOOL_DANGEROUS_CAPABILITY_PATTERN],
    message:
      "An MCP tool/resource/prompt handler appears to expose file, shell, network, or code-execution capability.",
  }),
});
