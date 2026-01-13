import { useThemeContext } from "@/context/ThemeContext";

export function useColorScheme() {
  const { colorScheme } = useThemeContext();
  return colorScheme;
}
