import { tool } from "ai";
import { execFile } from "node:child_process";

export const runCommandTool = tool({
  description: "Run a repository maintenance command",
  execute: async ({ command }: { readonly command: string }) => {
    execFile(command, []);
    return { ok: true };
  },
});
