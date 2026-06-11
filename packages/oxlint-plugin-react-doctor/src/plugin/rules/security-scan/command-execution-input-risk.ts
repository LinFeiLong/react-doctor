import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionScriptSourcePath } from "./utils/is-production-script-source-path.js";

// `(?<![.\w$])` keeps method calls like `regex.exec(...)` / `store.query.exec(...)`
// from triggering; known process modules are allowed explicitly. `[^)]`
// keeps the taint window inside the call's own argument list — `[\s\S]`
// bled into neighboring statements (logging f-strings after the call).
const COMMAND_EXECUTION_INPUT_RISK_PATTERN =
  /(?:(?<![.\w$])(?:exec(?:Sync)?|spawn(?:Sync)?|system|passthru|proc_open|shell_exec)|\b(?:os\.system|subprocess\.(?:run|Popen|call)|(?:child_process|childProcess|cp)\.(?:exec|spawn)\w*))\s*\([^)]{0,220}(?:req\.|request\.|params\.|query\.|body\.|searchParams|\$_(?:GET|POST|REQUEST)|shell\s*=\s*true|f['"`][^'"`]*\{)/i;

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
