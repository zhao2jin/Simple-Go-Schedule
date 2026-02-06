import { getApiUrl } from './query-client';

export const API_URL = getApiUrl();

export function buildApiUrl(path: string): string {
  const base = API_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
