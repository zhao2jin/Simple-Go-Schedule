import Constants from "expo-constants";

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
  if (configUrl) {
    return normalizeUrl(configUrl);
  }

  if (__DEV__) {
    return "http://localhost:5000";
  }

  throw new Error(
    "API URL is not configured. Set EXPO_PUBLIC_API_URL or expo.extra.apiUrl.",
  );
}

export const API_URL = getApiUrl();
