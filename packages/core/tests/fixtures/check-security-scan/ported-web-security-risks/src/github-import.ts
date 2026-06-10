export const buildRepositoryApiUrl = (owner: string, repo: string) => {
  return `https://api.github.com/repos/${owner}/${repo}`;
};
