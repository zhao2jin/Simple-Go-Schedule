import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Image, Switch, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { getPreferences, savePreferences, clearAllData } from "@/lib/storage";
import type { UserPreferences } from "@shared/types";

type ThemeMode = "light" | "dark" | "auto";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();

  const [preferences, setPreferences] = useState<UserPreferences>({
    displayName: "Commuter",
    themeMode: "auto",
    notificationsEnabled: false,
  });

  const loadPreferences = useCallback(async () => {
    const prefs = await getPreferences();
    setPreferences(prefs);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPreferences();
    }, [loadPreferences])
  );

  const handleToggleNotifications = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPrefs = { ...preferences, notificationsEnabled: value };
    setPreferences(newPrefs);
    await savePreferences(newPrefs);
  };

  const handleThemeChange = async (mode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newPrefs = { ...preferences, themeMode: mode };
    setPreferences(newPrefs);
    await savePreferences(newPrefs);
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
            loadPreferences();
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
      <View style={styles.profileSection}>
        <Image
          source={require("../../assets/images/profile-avatar.png")}
          style={styles.avatar}
          resizeMode="cover"
        />
        <ThemedText type="h3" style={styles.displayName}>
          {preferences.displayName}
        </ThemedText>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          GO Transit Commuter
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText
          type="caption"
          style={[styles.sectionHeader, { color: theme.textSecondary }]}
        >
          PREFERENCES
        </ThemedText>

        <View
          style={[
            styles.settingCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Feather name="bell" size={20} color={theme.text} />
              <ThemedText style={styles.settingLabel}>Notifications</ThemedText>
            </View>
            <Switch
              value={preferences.notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: theme.backgroundSecondary, true: Colors.light.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View
          style={[
            styles.settingCard,
            { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
          ]}
        >
          <ThemedText
            type="caption"
            style={[styles.themeLabel, { color: theme.textSecondary }]}
          >
            Theme
          </ThemedText>
          <View style={styles.themeOptions}>
            {(["light", "dark", "auto"] as ThemeMode[]).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => handleThemeChange(mode)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor:
                      preferences.themeMode === mode
                        ? Colors.light.primary
                        : theme.backgroundSecondary,
                  },
                ]}
              >
                <Feather
                  name={mode === "light" ? "sun" : mode === "dark" ? "moon" : "monitor"}
                  size={16}
                  color={preferences.themeMode === mode ? "#fff" : theme.text}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: preferences.themeMode === mode ? "#fff" : theme.text,
                    marginLeft: Spacing.xs,
                    textTransform: "capitalize",
                  }}
                >
                  {mode}
                </ThemedText>
              </Pressable>
            ))}
          </View>
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
  profileSection: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.lg,
  },
  displayName: {
    marginBottom: Spacing.xs,
  },
  section: {
    marginTop: Spacing["2xl"],
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
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingLabel: {
    fontWeight: "500",
  },
  themeLabel: {
    marginBottom: Spacing.md,
    fontWeight: "500",
  },
  themeOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  themeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
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
