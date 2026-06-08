import { readFile } from "node:fs/promises";

const FILES = {
  guide: "docs/guide.md",
  faq: "docs/faq.md",
} as const;

export const POST = async (request: Request) => {
  const { id } = await request.json();
  const filePath = FILES[id as keyof typeof FILES] ?? FILES.guide;
  return new Response(await readFile(filePath, "utf-8"));
};
