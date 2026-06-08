export const fixtureSource = `
import { readFile } from "node:fs/promises";

export const POST = async (request) => {
  const body = await request.json();
  return new Response(await readFile(body.path, "utf-8"));
};
`;
