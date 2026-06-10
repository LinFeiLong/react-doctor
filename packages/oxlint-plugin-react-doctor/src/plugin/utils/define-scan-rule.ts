import { defineRule } from "./define-rule.js";
import type { FileScan } from "./file-scan.js";
import type { Rule } from "./rule.js";

// Scan rules register metadata like any rule but never visit AST nodes:
// they are excluded from the generated oxlint config, and @react-doctor/core's
// check-security-scan environment check executes `scan` over a whole-tree
// file walk instead. `id:` and `severity:` must stay literal fields in the
// rule file — scripts/generate-rule-registry.mjs regex-parses them at codegen.
export const defineScanRule = (rule: Omit<Rule, "create"> & { scan: FileScan }): Rule =>
  defineRule({ ...rule, create: () => ({}) });
