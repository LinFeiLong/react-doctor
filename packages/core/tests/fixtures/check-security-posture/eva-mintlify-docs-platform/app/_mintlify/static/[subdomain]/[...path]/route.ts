const CDN_BASE_URL = "https://cdn.mintlify.com";

export const GET = async (
  request: Request,
  context: { params: { subdomain: string; path: string[] } },
) => {
  const host = request.headers.get("host") ?? "";
  const requestedPath = `/${decodeURIComponent(context.params.path.join("/"))}`;
  const assetResponse = await fetch(`${CDN_BASE_URL}/${context.params.subdomain}${requestedPath}`, {
    headers: {
      "x-docs-host": host,
    },
    next: {
      revalidate: 3600,
    },
  });

  return assetResponse;
};
