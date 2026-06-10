import { McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { readFile } from "node:fs/promises";

const server = new McpServer({ name: "repo-tools", version: "1.0.0" });

server.tool("read_file", async ({ path }: { readonly path: string }) => {
  return {
    content: [{ type: "text", text: await readFile(path, "utf-8") }],
  };
});
