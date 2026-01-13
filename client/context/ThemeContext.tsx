import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { getPreferences, savePreferences } from "@/lib/storage";

type ThemeMode = "light" | "dark" | "auto";
type ColorScheme = "light" | "dark";

interface ThemeContextType {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: "auto",
  colorScheme: "light",
  setThemeMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const prefs = await getPreferences();
      setThemeModeState(prefs.themeMode as ThemeMode);
      setIsLoaded(true);
    })();
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    savePreferences({ themeMode: mode });
  }, []);

  const colorScheme: ColorScheme =
    themeMode === "auto"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ themeMode, colorScheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
