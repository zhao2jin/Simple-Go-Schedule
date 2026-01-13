import React from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useThemeContext } from "@/context/ThemeContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { clearAllData } from "@/lib/storage";

type ThemeMode = "light" | "dark" | "auto";

const themeOptions: { value: ThemeMode; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "auto", label: "Automatic", icon: "smartphone" },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { themeMode, setThemeMode } = useThemeContext();

  const handleThemeChange = (mode: ThemeMode) => {
    Haptics.selectionAsync();
    setThemeMode(mode);
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear All Data",
      "This will remove all your saved routes and preferences. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            await clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["2xl"],
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >

      <View style={styles.section}>
        <ThemedText
          type="caption"
          style={[styles.sectionHeader, { color: theme.textSecondary }]}
        >
          APPEARANCE
        </ThemedText>

        <View
          style={[
            styles.settingCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          {themeOptions.map((option, index) => (
            <React.Fragment key={option.value}>
              <Pressable
                onPress={() => handleThemeChange(option.value)}
                style={({ pressed }) => [
                  styles.themeRow,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.themeRowLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name={option.icon as any}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                  <ThemedText>{option.label}</ThemedText>
                </View>
                {themeMode === option.value ? (
                  <Feather name="check" size={20} color={Colors.light.primary} />
                ) : null}
              </Pressable>
              {index < themeOptions.length - 1 ? (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              ) : null}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText
          type="caption"
          style={[styles.sectionHeader, { color: theme.textSecondary }]}
        >
          ABOUT
        </ThemedText>

        <View
          style={[
            styles.settingCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View style={styles.aboutRow}>
            <ThemedText>Version</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>1.0.0</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.aboutRow}>
            <ThemedText>Data Source</ThemedText>
            <ThemedText style={{ color: theme.textSecondary }}>Metrolinx Open API</ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={handleClearData}
          style={({ pressed }) => [
            styles.dangerButton,
            {
              backgroundColor: pressed
                ? Colors.light.delayed + "20"
                : "transparent",
              borderColor: Colors.light.delayed,
            },
          ]}
        >
          <Feather name="trash-2" size={18} color={Colors.light.delayed} />
          <ThemedText style={[styles.dangerText, { color: Colors.light.delayed }]}>
            Clear All Data
          </ThemedText>
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    fontWeight: "600",
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  settingCard: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  themeRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  dangerText: {
    fontWeight: "600",
  },
});
