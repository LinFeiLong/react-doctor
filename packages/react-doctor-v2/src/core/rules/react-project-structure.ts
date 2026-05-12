import { defineRule } from "./registry.js";

export const reactProjectStructureRule = defineRule({
  metadata: {
    id: "react-doctor/react-project-structure",
    name: "React project structure",
    description: "Discovers the React project boundary and records project-level metadata.",
    category: "project",
    severity: "info",
    defaultEnabled: true,
    tags: ["project", "discovery"],
  },
  run: () => ({
    issues: [],
  }),
});
