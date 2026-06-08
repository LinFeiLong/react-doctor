export const POST = async (request: Request) => {
  const event = await request.json();
  return Response.json({ received: event.type });
};
