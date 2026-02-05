import React from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { DepartureRow } from "@/components/DepartureRow";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { JourneyResult } from "@shared/types";

type RouteDetailRouteProp = RouteProp<RootStackParamList, "RouteDetail">;

export default function RouteDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<RouteDetailRouteProp>();

  const { origin, destination } = route.params;

  const [originName, originCode] = origin.split("|");
  const [destName, destCode] = destination.split("|");

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<JourneyResult>({
    queryKey: ["/api/journey", `origin=${originCode}`, `destination=${destCode}`],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const departures = data?.departures || [];
  const alerts = data?.alerts || [];

  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={theme.text}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.routeInfo}>
          <ThemedText type="title">{originName}</ThemedText>
          <Feather
            name="arrow-right"
            size={16}
            color={theme.textSecondary}
            style={styles.arrowIcon}
          />
          <ThemedText type="title">{destName}</ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Updated {currentTime}
        </ThemedText>
      </View>

      {alerts.length > 0 ? (
        <View
          style={[
            styles.alertsContainer,
            { backgroundColor: Colors.light.accent + "20", borderColor: Colors.light.accent },
          ]}
        >
          <View style={styles.alertHeader}>
            <Feather name="alert-triangle" size={18} color={Colors.light.accent} />
            <ThemedText type="title" style={{ color: Colors.light.accent, marginLeft: Spacing.sm }}>
              Service Alerts
            </ThemedText>
          </View>
          {alerts.map((alert, i) => (
            <View key={alert.id || i} style={styles.alertItem}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {alert.title}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                {alert.description}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.departuresSection}>
        <ThemedText
          type="caption"
          style={[styles.sectionHeader, { color: theme.textSecondary }]}
        >
          UPCOMING DEPARTURES
        </ThemedText>

        {isLoading ? (
          <SkeletonLoader count={5} />
        ) : departures.length > 0 ? (
          departures.map((departure, index) => (
            <DepartureRow
              key={`${departure.tripNumber}-${index}`}
              departure={departure}
            />
          ))
        ) : (
          <View style={styles.noDepartures}>
            <Feather name="clock" size={48} color={theme.textSecondary} />
            <ThemedText
              type="body"
              style={[styles.noDeparturesText, { color: theme.textSecondary }]}
            >
              No upcoming departures found
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, textAlign: "center" }}
            >
              This could be due to no scheduled service or the API not having real-time data for this route.
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
  routeInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: Spacing.sm,
  },
  arrowIcon: {
    marginHorizontal: Spacing.sm,
  },
  alertsContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing["2xl"],
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  alertItem: {
    marginTop: Spacing.sm,
  },
  departuresSection: {
    flex: 1,
  },
  sectionHeader: {
    fontWeight: "600",
    marginBottom: Spacing.lg,
    marginLeft: Spacing.xs,
  },
  noDepartures: {
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.lg,
  },
  noDeparturesText: {
    textAlign: "center",
    marginTop: Spacing.md,
  },
});
