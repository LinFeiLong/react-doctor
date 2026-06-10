import { tool } from "ai";

export const formatTool = tool({
  description: "Format a display name",
  execute: async ({ name }: { readonly name: string }) => {
    return { displayName: name.trim().slice(0, 40) };
  },
});
