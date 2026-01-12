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
import { GO_LINES, type GoLine } from "@shared/lines";
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
  const [selectedLine, setSelectedLine] = useState<GoLine | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const stationsForLine = useMemo(() => {
    if (!selectedLine) return [];
    return stations.filter((s) => selectedLine.stationCodes.includes(s.code));
  }, [selectedLine, stations]);

  const filteredStations = useMemo(() => {
    if (!searchQuery.trim()) return stationsForLine;
    const query = searchQuery.toLowerCase();
    return stationsForLine.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.code.toLowerCase().includes(query) ||
        s.locationName?.toLowerCase().includes(query)
    );
  }, [stationsForLine, searchQuery]);

  const handleSelectLine = (line: GoLine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLine(line);
  };

  const handleSelectStation = (station: Station) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(station);
    setIsOpen(false);
    setSelectedLine(null);
    setSearchQuery("");
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLine(null);
    setSearchQuery("");
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedLine(null);
    setSearchQuery("");
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
            {selectedLine ? (
              <Pressable testID={`${testID}-back-button`} onPress={handleBack} style={styles.backButton}>
                <Feather name="chevron-left" size={24} color={Colors.light.primary} />
                <ThemedText style={{ color: Colors.light.primary }}>Lines</ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="h4">Select Line</ThemedText>
            )}
            <Pressable testID={`${testID}-done-button`} onPress={handleClose}>
              <ThemedText style={{ color: Colors.light.primary }}>Done</ThemedText>
            </Pressable>
          </View>

          {selectedLine ? (
            <>
              <View style={styles.lineHeaderContainer}>
                <View style={[styles.lineIndicator, { backgroundColor: selectedLine.color }]} />
                <ThemedText type="h4">{selectedLine.name}</ThemedText>
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
                    onPress={() => handleSelectStation(item)}
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
            </>
          ) : (
            <FlatList
              data={GO_LINES}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
              renderItem={({ item }) => (
                <Pressable
                  testID={`${testID}-line-${item.id}`}
                  onPress={() => handleSelectLine(item)}
                  style={({ pressed }) => [
                    styles.lineItem,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSecondary
                        : "transparent",
                    },
                  ]}
                >
                  <View style={[styles.lineColor, { backgroundColor: item.color }]} />
                  <ThemedText type="body" style={styles.lineName}>
                    {item.name}
                  </ThemedText>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              )}
            />
          )}
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  lineHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  lineIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
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
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  lineColor: {
    width: 8,
    height: 40,
    borderRadius: 4,
    marginRight: Spacing.lg,
  },
  lineName: {
    flex: 1,
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
