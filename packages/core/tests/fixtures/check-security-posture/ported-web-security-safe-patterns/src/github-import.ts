const OWNER_PATTERN = /^[a-z0-9-]+$/i;

export const buildRepositoryApiUrl = (owner: string, repo: string) => {
  if (!OWNER_PATTERN.test(owner) || !OWNER_PATTERN.test(repo)) {
    throw new Error("invalid repository slug");
  }

  const url = new URL("https://api.github.com/repos/");
  url.pathname = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  return url.toString();
};
