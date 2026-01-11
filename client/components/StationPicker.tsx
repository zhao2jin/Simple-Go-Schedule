import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { Station } from "@shared/types";

interface StationPickerProps {
  label: string;
  value?: Station;
  stations: Station[];
  onSelect: (station: Station) => void;
  placeholder?: string;
  testID?: string;
}

export function StationPicker({
  label,
  value,
  stations,
  onSelect,
  placeholder = "Select station",
  testID,
}: StationPickerProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stations;
    const query = searchQuery.toLowerCase();
    return stations.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.locationName?.toLowerCase().includes(query)
    );
  }, [stations, searchQuery]);

  const handleSelect = (station: Station) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(station);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <Pressable
        testID={testID}
        onPress={handleOpen}
        style={[
          styles.selector,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.selectorText,
            !value && { color: theme.textSecondary },
          ]}
        >
          {value ? value.name : placeholder}
        </ThemedText>
        <Feather name="chevron-down" size={20} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet">
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.backgroundRoot,
              paddingTop: insets.top + Spacing.lg,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <ThemedText type="h4">{label}</ThemedText>
            <Pressable testID={`${testID}-done-button`} onPress={() => setIsOpen(false)}>
              <ThemedText style={{ color: Colors.light.primary }}>Done</ThemedText>
            </Pressable>
          </View>

          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <Feather name="search" size={18} color={theme.textSecondary} />
            <TextInput
              testID={`${testID}-search-input`}
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search stations..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <Pressable testID={`${testID}-clear-search`} onPress={() => setSearchQuery("")}>
                <Feather name="x-circle" size={18} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={filteredStations}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
            renderItem={({ item }) => (
              <Pressable
                testID={`${testID}-station-${item.code}`}
                onPress={() => handleSelect(item)}
                style={({ pressed }) => [
                  styles.stationItem,
                  {
                    backgroundColor: pressed
                      ? theme.backgroundSecondary
                      : "transparent",
                  },
                ]}
              >
                <View style={styles.stationInfo}>
                  <ThemedText type="body">{item.name}</ThemedText>
                  {item.locationName ? (
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary }}
                    >
                      {item.locationName}
                    </ThemedText>
                  ) : null}
                </View>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                >
                  {item.code}
                </ThemedText>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <ThemedText style={{ color: theme.textSecondary }}>
                  No stations found
                </ThemedText>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  selectorText: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  stationItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  stationInfo: {
    flex: 1,
  },
  emptyList: {
    padding: Spacing["2xl"],
    alignItems: "center",
  },
});
