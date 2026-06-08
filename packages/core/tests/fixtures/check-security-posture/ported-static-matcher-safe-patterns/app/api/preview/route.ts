export const POST = async (request: Request) => {
  const { imageUrl } = await request.json();
  const response = await fetch(imageUrl, { redirect: "manual" });

  return new Response(response.body);
};
