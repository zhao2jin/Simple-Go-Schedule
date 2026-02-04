import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { Departure } from "@shared/types";

interface DepartureRowProps {
  departure: Departure;
  onPress?: () => void;
}

function formatTime(timeString: string): string {
  if (!timeString) return "--:--";
  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      const match = timeString.match(/(\d{2}):(\d{2})/);
      if (match) return `${match[1]}:${match[2]}`;
      return timeString.slice(0, 5);
    }
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return timeString.slice(0, 5) || "--:--";
  }
}

export function DepartureRow({ departure, onPress }: DepartureRowProps) {
  const { theme } = useTheme();

  const isDelayed = departure.status === "delayed";
  const isCancelled = departure.status === "cancelled";

  const statusColor = isCancelled
    ? Colors.light.delayed
    : isDelayed
      ? Colors.light.delayed
      : Colors.light.onTime;

  const statusText = isCancelled
    ? "Cancelled"
    : isDelayed && departure.delay > 0
      ? `Delayed ${departure.delay} min`
      : "On Time";

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
          opacity: isCancelled ? 0.6 : 1,
        },
      ]}
    >
      <View style={styles.timeSection}>
        <ThemedText
          type="h3"
          style={[
            styles.departureTime,
            isCancelled && styles.cancelled,
          ]}
        >
          {formatTime(departure.departureTime)}
        </ThemedText>
        {departure.arrivalTime ? (
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary }}
          >
            Arr. {formatTime(departure.arrivalTime)}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.infoSection}>
        {departure.line ? (
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {departure.line}
          </ThemedText>
        ) : null}
        {departure.platform ? (
          <View style={styles.platformBadge}>
            <ThemedText type="small" style={{ fontWeight: "600" }}>
              Platform {departure.platform}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + "20" },
          ]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusColor }]}
          />
          <ThemedText
            type="small"
            style={[styles.statusText, { color: statusColor }]}
          >
            {statusText}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  timeSection: {
    minWidth: 80,
  },
  departureTime: {
    fontWeight: "700",
  },
  cancelled: {
    textDecorationLine: "line-through",
  },
  infoSection: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  platformBadge: {
    marginTop: Spacing.xs,
  },
  statusSection: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    gap: Spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontWeight: "500",
  },
});
