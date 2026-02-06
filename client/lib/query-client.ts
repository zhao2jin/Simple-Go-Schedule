import { QueryClient, QueryFunction } from "@tanstack/react-query";

const PRODUCTION_API_URL = "https://transit-watch--7pt4dmysby.replit.app";

function resolveApiBase(): string {
  try {
    const host = process.env.EXPO_PUBLIC_DOMAIN;
    if (host && typeof host === "string" && host.length > 0) {
      const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/+$/, "");
      return "https://" + cleanHost;
    }
  } catch {}

  try {
    const Constants = require("expo-constants").default;
    const extra = Constants?.expoConfig?.extra
      || Constants?.manifest?.extra
      || Constants?.manifest2?.extra;
    if (extra && extra.apiUrl && typeof extra.apiUrl === "string") {
      return extra.apiUrl.replace(/\/+$/, "");
    }
  } catch {}

  return PRODUCTION_API_URL;
}

let _cachedApiUrl: string | null = null;

export function getApiUrl(): string {
  if (!_cachedApiUrl) {
    _cachedApiUrl = resolveApiBase();
  }
  return _cachedApiUrl;
}

function buildUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = buildUrl(getApiUrl(), route);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const base = getApiUrl();
    const path = queryKey[0] as string;
    const params = queryKey.slice(1).join("&");
    const fullPath = params ? `${path}?${params}` : path;
    const url = buildUrl(base, fullPath);

    const res = await fetch(url);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 30000,
      retry: 1,
    },
    mutations: {
      retry: false,
    },
  },
});
