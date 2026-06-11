export const buildRepositoryApiUrl = (req: { query: { owner: string; repo: string } }) => {
  return `https://api.github.com/repos/${req.query.owner}/${req.query.repo}`;
};
