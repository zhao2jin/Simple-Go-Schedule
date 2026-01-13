import React, { useState } from "react";
import { View, StyleSheet, Platform, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import type { SavedRoute, Departure } from "@shared/types";

interface RouteCardProps {
  route: SavedRoute;
  departures: Departure[];
  isReversed: boolean;
  hasAlert?: boolean;
  onPress: () => void;
  index: number;
  isLoading?: boolean;
}

function formatTime(timeString: string): string {
  if (!timeString) return "--:--";
  try {
    let date: Date;
    const match = timeString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (match) {
      date = new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5])
      );
    } else {
      date = new Date(timeString);
    }
    
    if (isNaN(date.getTime())) {
      const timeMatch = timeString.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const mins = timeMatch[2];
        const period = hours >= 12 ? "PM" : "AM";
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${mins} ${period}`;
      }
      return timeString.slice(0, 5);
    }
    
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return timeString.slice(0, 5) || "--:--";
  }
}

function getMinutesUntil(timeString: string): number {
  if (!timeString) return 0;
  try {
    const now = new Date();
    let departure: Date;
    
    const match = timeString.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (match) {
      departure = new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3]),
        parseInt(match[4]),
        parseInt(match[5])
      );
    } else {
      const timeMatch = timeString.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        departure = new Date();
        departure.setHours(parseInt(timeMatch[1], 10));
        departure.setMinutes(parseInt(timeMatch[2], 10));
        departure.setSeconds(0);
      } else {
        departure = new Date(timeString);
      }
    }
    
    if (isNaN(departure.getTime())) return 0;
    const diff = Math.round((departure.getTime() - now.getTime()) / 60000);
    return Math.max(0, diff);
  } catch {
    return 0;
  }
}

function getStatusLabel(status: string, delay: number): string {
  if (status === "cancelled") return "Cancelled";
  if (status === "delayed" && delay > 0) return `Delayed +${delay}m`;
  if (status === "delayed") return "Delayed";
  return "On Time";
}

function getStatusColor(status: string): string {
  if (status === "cancelled") return Colors.light.delayed;
  if (status === "delayed") return Colors.light.delayed;
  return Colors.light.primary;
}

function StatusDetailModal({ 
  visible, 
  onClose, 
  departure 
}: { 
  visible: boolean; 
  onClose: () => void; 
  departure: Departure | null;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  if (!departure) return null;

  const statusColor = getStatusColor(departure.status);
  const statusLabel = getStatusLabel(departure.status, departure.delay);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View
        style={[
          styles.modalContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        <View style={styles.modalHeader}>
          <ThemedText type="h4">Service Status</ThemedText>
          <Pressable onPress={onClose}>
            <ThemedText style={{ color: Colors.light.primary }}>Done</ThemedText>
          </Pressable>
        </View>

        <View style={styles.modalContent}>
          <View style={[styles.statusCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
              <Feather 
                name={departure.status === "cancelled" ? "x-circle" : departure.status === "delayed" ? "clock" : "check-circle"} 
                size={24} 
                color={statusColor} 
              />
              <ThemedText style={[styles.statusTitle, { color: statusColor }]}>
                {statusLabel}
              </ThemedText>
            </View>

            <View style={styles.detailsSection}>
              <View style={styles.detailRow}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Scheduled Time
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {formatTime(departure.departureTime)}
                </ThemedText>
              </View>

              {departure.delay > 0 ? (
                <View style={styles.detailRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Expected Delay
                  </ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "600", color: Colors.light.delayed }}>
                    +{departure.delay} minutes
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Trip Number
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {departure.tripNumber}
                </ThemedText>
              </View>

              {departure.line ? (
                <View style={styles.detailRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Line
                  </ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {departure.line}
                  </ThemedText>
                </View>
              ) : null}

              {departure.platform ? (
                <View style={styles.detailRow}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Platform
                  </ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {departure.platform}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {departure.status === "delayed" ? (
              <View style={[styles.infoBox, { backgroundColor: Colors.light.delayed + "10", borderColor: Colors.light.delayed + "30" }]}>
                <Feather name="info" size={16} color={Colors.light.delayed} />
                <ThemedText type="small" style={{ color: Colors.light.delayed, flex: 1 }}>
                  This train is running behind schedule. Please check platform displays for updates.
                </ThemedText>
              </View>
            ) : null}

            {departure.status === "cancelled" ? (
              <View style={[styles.infoBox, { backgroundColor: Colors.light.delayed + "10", borderColor: Colors.light.delayed + "30" }]}>
                <Feather name="alert-circle" size={16} color={Colors.light.delayed} />
                <ThemedText type="small" style={{ color: Colors.light.delayed, flex: 1 }}>
                  This service has been cancelled. Please check for alternative trains.
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function RouteCard({
  route,
  departures,
  isReversed,
  hasAlert,
  index,
  isLoading,
}: RouteCardProps) {
  const { theme } = useTheme();
  const useGlass = isLiquidGlassAvailable();
  const [selectedDeparture, setSelectedDeparture] = useState<Departure | null>(null);

  const origin = isReversed ? route.destinationName : route.originName;
  const destination = isReversed ? route.originName : route.destinationName;

  const nextThree = departures.slice(0, 3);

  const handleDepartureTap = (dep: Departure) => {
    if (dep.status !== "on_time") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDeparture(dep);
    }
  };

  const cardContent = (
    <>
      <View style={styles.routeHeader}>
        <ThemedText
          type="caption"
          style={[styles.routeText, { color: theme.textSecondary }]}
        >
          {origin}
        </ThemedText>
        <Feather
          name="arrow-right"
          size={14}
          color={theme.textSecondary}
          style={styles.arrowIcon}
        />
        <ThemedText
          type="caption"
          style={[styles.routeText, { color: theme.textSecondary }]}
        >
          {destination}
        </ThemedText>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.skeleton, { backgroundColor: theme.backgroundSecondary }]} />
        </View>
      ) : nextThree.length > 0 ? (
        <View style={styles.departuresContainer}>
          {nextThree.map((dep, i) => {
            const mins = getMinutesUntil(dep.departureTime);
            const statusLabel = getStatusLabel(dep.status, dep.delay);
            const statusColor = getStatusColor(dep.status);
            const isTappable = dep.status !== "on_time";
            
            const rowContent = (
              <View 
                style={[
                  styles.departureRow,
                  i < nextThree.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.timeSection}>
                  <ThemedText
                    style={[styles.departureTime, { color: theme.text }]}
                  >
                    {formatTime(dep.departureTime)}
                  </ThemedText>
                  <View style={styles.statusRow}>
                    <ThemedText
                      type="small"
                      style={{ color: statusColor }}
                    >
                      {statusLabel}
                    </ThemedText>
                    {isTappable ? (
                      <Feather name="chevron-right" size={14} color={statusColor} />
                    ) : null}
                  </View>
                  {dep.platform ? (
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary }}
                    >
                      Platform {dep.platform}
                    </ThemedText>
                  ) : null}
                </View>
                <View style={styles.statusSection}>
                  <ThemedText
                    type="body"
                    style={[styles.minutesText, { color: Colors.light.primary }]}
                  >
                    {mins > 0 ? `${mins} min` : "Now"}
                  </ThemedText>
                  {dep.line ? (
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary }}
                    >
                      {dep.line}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            );

            return isTappable ? (
              <Pressable 
                key={i} 
                onPress={() => handleDepartureTap(dep)}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              >
                {rowContent}
              </Pressable>
            ) : (
              <View key={i}>{rowContent}</View>
            );
          })}
        </View>
      ) : (
        <View style={styles.noDeparturesContainer}>
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary }}
          >
            No upcoming departures
          </ThemedText>
        </View>
      )}

      {hasAlert ? (
        <View style={[styles.alertBadge, { backgroundColor: Colors.light.accent }]}>
          <Feather name="alert-triangle" size={12} color="#000" />
          <ThemedText style={styles.alertText}>Service Alert</ThemedText>
        </View>
      ) : null}

      <StatusDetailModal
        visible={selectedDeparture !== null}
        onClose={() => setSelectedDeparture(null)}
        departure={selectedDeparture}
      />
    </>
  );

  return (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
      {useGlass && Platform.OS === "ios" ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={Colors.light.primary + "12"}
          style={[styles.glassCard, { padding: Spacing.lg }]}
        >
          {cardContent}
        </GlassView>
      ) : (
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          {cardContent}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  glassCard: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  routeText: {
    flexShrink: 1,
  },
  arrowIcon: {
    marginHorizontal: Spacing.sm,
  },
  departuresContainer: {
    flexDirection: "column",
  },
  departureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
  },
  timeSection: {
    flex: 1,
    gap: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusSection: {
    alignItems: "flex-end",
    gap: 2,
  },
  departureTime: {
    fontSize: 20,
    fontWeight: "600",
  },
  minutesText: {
    fontWeight: "600",
  },
  noDeparturesContainer: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  alertText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  loadingContainer: {
    height: 80,
    justifyContent: "center",
  },
  skeleton: {
    height: 52,
    borderRadius: BorderRadius.sm,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },
  modalContent: {
    flex: 1,
  },
  statusCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailsSection: {
    gap: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
});
