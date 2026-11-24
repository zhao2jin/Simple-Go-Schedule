import Constants from "expo-constants";

const PRODUCTION_API_URL =
  "https://simple-go-schedule-api-759545657799.northamerica-northeast2.run.app";

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const protocol =
    trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1")
      ? "http"
      : "https";
  return `${protocol}://${trimmed}`;
}

export function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    return normalizeUrl(envUrl);
  }

  const envDomain = process.env.EXPO_PUBLIC_DOMAIN;
  if (envDomain) {
    return normalizeUrl(envDomain);
  }

  const configUrl = Constants.expoConfig?.extra?.apiUrl;
  if (typeof configUrl === "string" && configUrl.length > 0) {
    return normalizeUrl(configUrl);
  }

  return PRODUCTION_API_URL;
}

export const API_URL = getApiUrl();

export function buildApiUrl(path: string): string {
  const base = API_URL.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
