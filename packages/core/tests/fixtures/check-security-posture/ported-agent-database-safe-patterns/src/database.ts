export const loadUser = async (client: any, userId: string) => {
  return client.query("SELECT * FROM users WHERE id = $1", [userId]);
};
