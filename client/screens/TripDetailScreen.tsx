import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { TripDetail } from "@shared/types";

type TripDetailRouteProp = RouteProp<RootStackParamList, "TripDetail">;

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

export default function TripDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<TripDetailRouteProp>();

  const { tripNumber, origin, destination } = route.params;

  const { data, isLoading } = useQuery<TripDetail>({
    queryKey: ["/api/trip", tripNumber, origin, destination],
    queryFn: async () => {
      const params = new URLSearchParams({
        origin,
        destination,
      });
      const response = await fetch(`/api/trip/${tripNumber}?${params}`);
      if (!response.ok) throw new Error("Failed to fetch trip details");
      return response.json();
    },
    staleTime: 30000,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["2xl"],
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        <View style={styles.tripInfo}>
          <Feather
            name={data?.vehicleType === "bus" ? "truck" : "navigation"}
            size={20}
            color={Colors.light.primary}
          />
          <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
            Trip {tripNumber}
          </ThemedText>
        </View>
        {data?.line && (
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
            {data.line}
          </ThemedText>
        )}
      </View>

      <View style={styles.stopsSection}>
        <ThemedText
          type="caption"
          style={[styles.sectionHeader, { color: theme.textSecondary }]}
        >
          STATION STOPS
        </ThemedText>

        {isLoading ? (
          <SkeletonLoader count={5} />
        ) : data?.stops && data.stops.length > 0 ? (
          <View style={styles.stopsContainer}>
            {data.stops.map((stop, index) => {
              const isFirst = index === 0;
              const isLast = index === data.stops.length - 1;
              const arrivalTime = formatTime(stop.arrivalTime);
              const departureTime = formatTime(stop.departureTime);

              return (
                <View key={`${stop.stationCode}-${index}`} style={styles.stopRow}>
                  <View style={styles.timelineContainer}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: isFirst || isLast ? Colors.light.primary : theme.border,
                        },
                      ]}
                    />
                    {!isLast && (
                      <View
                        style={[styles.timelineLine, { backgroundColor: theme.border }]}
                      />
                    )}
                  </View>

                  <View
                    style={[
                      styles.stopCard,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.stopHeader}>
                      <ThemedText type="body" style={{ fontWeight: "600" }}>
                        {stop.stationName}
                      </ThemedText>
                      {stop.platform && (
                        <View
                          style={[
                            styles.platformBadge,
                            { backgroundColor: theme.backgroundSubtle },
                          ]}
                        >
                          <ThemedText type="small" style={{ fontWeight: "600" }}>
                            Platform {stop.platform}
                          </ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.timesRow}>
                      {arrivalTime && arrivalTime !== "--:--" && (
                        <View style={styles.timeItem}>
                          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                            Arrival
                          </ThemedText>
                          <ThemedText type="body" style={{ fontWeight: "600" }}>
                            {arrivalTime}
                          </ThemedText>
                        </View>
                      )}
                      {departureTime && departureTime !== "--:--" && (
                        <View style={styles.timeItem}>
                          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                            Departure
                          </ThemedText>
                          <ThemedText type="body" style={{ fontWeight: "600" }}>
                            {departureTime}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noStops}>
            <Feather name="map-pin" size={48} color={theme.textSecondary} />
            <ThemedText
              type="body"
              style={[styles.noStopsText, { color: theme.textSecondary }]}
            >
              No stop information available
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  tripInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  stopsSection: {
    flex: 1,
  },
  sectionHeader: {
    fontWeight: "600",
    marginBottom: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  stopsContainer: {
    gap: Spacing.sm,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  timelineContainer: {
    width: 24,
    alignItems: "center",
    marginRight: Spacing.md,
    marginTop: Spacing.md,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
    minHeight: 60,
  },
  stopCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  stopHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  platformBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  timesRow: {
    flexDirection: "row",
    gap: Spacing.lg,
  },
  timeItem: {
    gap: 4,
  },
  noStops: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.lg,
  },
  noStopsText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
