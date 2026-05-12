import { reactDoctorOxlintRules } from "./rules.js";
import type { RulePlugin } from "./utils.js";

const plugin: RulePlugin = {
  meta: { name: "react-doctor" },
  rules: reactDoctorOxlintRules,
};

export default plugin;
