export const isConfigOrCiPath = (relativePath: string): boolean =>
  /(?:^|\/)(?:package\.json|Dockerfile|docker-compose\.ya?ml|\.github\/workflows\/[^/]+\.ya?ml|vercel\.json|next\.config\.[cm]?[jt]s|netlify\.toml)$/i.test(
    relativePath,
  );
