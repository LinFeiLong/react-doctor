interface GlobalProcessLike {
  env?: Record<string, string | undefined>;
  versions?: { node?: string };
}

const isGlobalProcessLike = (value: unknown): value is GlobalProcessLike =>
  typeof value === "object" && value !== null && "versions" in value;

const getGlobalProcess = (): GlobalProcessLike | undefined => {
  const candidate = Reflect.get(globalThis, "process");
  if (!isGlobalProcessLike(candidate)) return undefined;
  return candidate.versions?.node ? candidate : undefined;
};

const getProxyUrl = (): string | undefined => {
  const proc = getGlobalProcess();
  if (!proc?.env) return undefined;
  return proc.env.HTTPS_PROXY ?? proc.env.https_proxy ?? proc.env.HTTP_PROXY ?? proc.env.http_proxy;
};

const dispatcherCache = new Map<string, Promise<object | null>>();

const loadProxyDispatcher = async (proxyUrl: string): Promise<object | null> => {
  try {
    // @ts-expect-error undici is bundled with Node.js 22+ but lacks standalone type declarations
    const { ProxyAgent } = await import("undici");
    return new ProxyAgent(proxyUrl);
  } catch {
    return null;
  }
};

const getProxyDispatcher = (proxyUrl: string): Promise<object | null> => {
  const cached = dispatcherCache.get(proxyUrl);
  if (cached) return cached;
  const pending = loadProxyDispatcher(proxyUrl);
  dispatcherCache.set(proxyUrl, pending);
  return pending;
};

interface ProxyFetchInit extends RequestInit {
  dispatcher?: object;
}

export const proxyFetch: typeof fetch = async (url, init) => {
  const proxyUrl = getProxyUrl();
  const dispatcher = proxyUrl ? await getProxyDispatcher(proxyUrl) : null;

  const fetchInit: ProxyFetchInit = {
    ...init,
    ...(dispatcher ? { dispatcher } : {}),
  };
  return fetch(url, fetchInit);
};
