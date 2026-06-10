export const GET = () => {
  return new Response("ok", {
    headers: {
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Origin": "https://docs.cursor.com",
      "Set-Cookie": "session=abc; Domain=.cursor.com; Path=/",
    },
  });
};
