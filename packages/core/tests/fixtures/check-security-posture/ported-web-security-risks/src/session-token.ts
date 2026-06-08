import { createHash } from "node:crypto";

export const createSessionToken = (userId: string) => {
  const nonce = Math.random().toString(36).slice(2);
  return createHash("sha1").update(`${userId}:${nonce}`).digest("hex");
};
