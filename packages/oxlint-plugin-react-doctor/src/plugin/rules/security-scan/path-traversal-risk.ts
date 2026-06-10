import { defineRule } from "../../utils/define-rule.js";
import { getMatchLocation } from "./utils/get-match-location.js";
import { isProductionSourcePath } from "./utils/is-production-source-path.js";

const PATH_TRAVERSAL_RISK_PATTERN =
  /\b(?:readFile|readFileSync|writeFile|writeFileSync)\s*\(\s*(?:req\.|request\.|params\.|query\.|body\.|parsed\.|`[^`]*(?:req\.|request\.|params\.|query\.|body\.))|\bpath\.(?:join|resolve)\s*\([^)]*\b(?:req\.|request\.|params\.|query\.|body\.|parsed\.)/;

export const pathTraversalRisk = defineRule({
  id: "path-traversal-risk",
  title: "Filesystem path uses caller input",
  severity: "warn",
  recommendation:
    "Resolve paths against a fixed base directory, reject traversal after normalization, and map user-visible identifiers to server-owned paths.",
  scan: (file) => {
    if (!isProductionSourcePath(file.relativePath)) return [];
    if (!PATH_TRAVERSAL_RISK_PATTERN.test(file.content)) return [];
    const location = getMatchLocation(file.content, PATH_TRAVERSAL_RISK_PATTERN);
    return [
      {
        message:
          "Filesystem access appears to use request, query, params, or body data as part of the path.",
        line: location.line,
        column: location.column,
      },
    ];
  },
});
