import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionScriptSourcePath } from "./utils/is-production-script-source-path.js";

const COMMAND_EXECUTION_INPUT_RISK_PATTERN =
  /\b(?:exec|execSync|spawn|os\.system|subprocess\.(?:run|Popen|call)|shell_exec|exec|system|passthru|proc_open)\s*\([\s\S]{0,220}(?:req\.|request\.|params\.|query\.|body\.|searchParams|\$_(?:GET|POST|REQUEST)|shell\s*=\s*true|f['"`][^'"`]*\{)/i;

export const commandExecutionInputRisk = defineRule({
  id: "command-execution-input-risk",
  title: "Command execution uses caller-shaped input",
  severity: "error",
  recommendation:
    "Avoid shell execution for caller-controlled values. Use fixed commands, argument arrays, strict allowlists, and no shell interpolation.",
  scan: (file) => {
    if (!isProductionScriptSourcePath(file.relativePath)) return [];
    if (!COMMAND_EXECUTION_INPUT_RISK_PATTERN.test(file.content)) return [];
    const location = getMatchLocation(file.content, COMMAND_EXECUTION_INPUT_RISK_PATTERN);
    return [
      {
        message:
          "Command execution appears to include request, query, body, or shell-interpolated input.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
