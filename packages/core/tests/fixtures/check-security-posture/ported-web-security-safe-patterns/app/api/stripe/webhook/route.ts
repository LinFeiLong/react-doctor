import { createHmac, timingSafeEqual } from "node:crypto";

export const POST = async (request: Request) => {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const expected = createHmac("sha256", "test-secret").update(body).digest();
  const provided = Buffer.from(signature.padEnd(expected.length, "0").slice(0, expected.length));

  if (!timingSafeEqual(expected, provided)) {
    return new Response("invalid signature", { status: 401 });
  }

  return Response.json({ received: true });
};
