import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedRoute, UserPreferences } from "@shared/types";

const ROUTES_KEY = "@go_tracker_routes";
const PREFERENCES_KEY = "@go_tracker_preferences";
const REVERSED_KEY = "@go_tracker_reversed";

const defaultPreferences: UserPreferences = {
  displayName: "Commuter",
  themeMode: "auto",
  notificationsEnabled: false,
};

export async function getSavedRoutes(): Promise<SavedRoute[]> {
  try {
    const data = await AsyncStorage.getItem(ROUTES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveRoute(route: SavedRoute): Promise<void> {
  const routes = await getSavedRoutes();
  const exists = routes.some((r) => r.id === route.id);
  if (!exists) {
    routes.push(route);
    await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
  }
}

export async function deleteRoute(routeId: string): Promise<void> {
  const routes = await getSavedRoutes();
  const filtered = routes.filter((r) => r.id !== routeId);
  await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(filtered));
}

export async function updateRoutesOrder(routes: SavedRoute[]): Promise<void> {
  await AsyncStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const data = await AsyncStorage.getItem(PREFERENCES_KEY);
    return data ? { ...defaultPreferences, ...JSON.parse(data) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export async function savePreferences(prefs: Partial<UserPreferences>): Promise<void> {
  const current = await getPreferences();
  const updated = { ...current, ...prefs };
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
}

export async function getReversedMode(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(REVERSED_KEY);
    return data === "true";
  } catch {
    return false;
  }
}

export async function setReversedMode(reversed: boolean): Promise<void> {
  await AsyncStorage.setItem(REVERSED_KEY, reversed ? "true" : "false");
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([ROUTES_KEY, PREFERENCES_KEY, REVERSED_KEY]);
}
