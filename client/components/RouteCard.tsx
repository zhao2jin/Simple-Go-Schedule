import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors, Typography } from "@/constants/theme";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

function getMinutesUntil(timeString: string): number {
  if (!timeString) return 0;
  try {
    const now = new Date();
    let departure: Date;
    
    const match = timeString.match(/(\d{2}):(\d{2})/);
    if (match) {
      departure = new Date();
      departure.setHours(parseInt(match[1], 10));
      departure.setMinutes(parseInt(match[2], 10));
      departure.setSeconds(0);
    } else {
      departure = new Date(timeString);
    }
    
    if (isNaN(departure.getTime())) return 0;
    const diff = Math.round((departure.getTime() - now.getTime()) / 60000);
    return Math.max(0, diff);
  } catch {
    return 0;
  }
}

export function RouteCard({
  route,
  departures,
  isReversed,
  hasAlert,
  onPress,
  index,
  isLoading,
}: RouteCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const origin = isReversed ? route.destinationName : route.originName;
  const destination = isReversed ? route.originName : route.destinationName;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 150 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const nextThree = departures.slice(0, 3);

  return (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: theme.border,
          },
          animatedStyle,
        ]}
      >
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
              const isDelayed = dep.status === "delayed";
              return (
                <View key={i} style={styles.departureItem}>
                  <ThemedText
                    style={[
                      styles.departureTime,
                      { color: isDelayed ? Colors.light.delayed : theme.text },
                    ]}
                  >
                    {formatTime(dep.departureTime)}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={[
                      styles.minutesText,
                      { color: isDelayed ? Colors.light.delayed : Colors.light.primary },
                    ]}
                  >
                    {mins > 0 ? `${mins} min` : "Now"}
                  </ThemedText>
                  {isDelayed && dep.delay > 0 ? (
                    <ThemedText
                      type="small"
                      style={[styles.delayText, { color: Colors.light.delayed }]}
                    >
                      +{dep.delay}m
                    </ThemedText>
                  ) : null}
                </View>
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
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  routeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  routeText: {
    flexShrink: 1,
  },
  arrowIcon: {
    marginHorizontal: Spacing.sm,
  },
  departuresContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  departureItem: {
    alignItems: "center",
    flex: 1,
  },
  departureTime: {
    fontSize: Typography.display.fontSize,
    fontWeight: "700",
  },
  minutesText: {
    marginTop: Spacing.xs,
    fontWeight: "600",
  },
  delayText: {
    marginTop: 2,
  },
  noDeparturesContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.lg,
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
});
