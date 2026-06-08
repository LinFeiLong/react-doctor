export const fixtureSource = `
export const POST = async (request) => {
  const { imageUrl } = await request.json();
  const response = await fetch(imageUrl);

  return new Response(response.body);
};
`;
