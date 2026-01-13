import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const useGlass = isLiquidGlassAvailable();

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
            const isDelayed = dep.status === "delayed";
            return (
              <View 
                key={i} 
                style={[
                  styles.departureRow,
                  i < nextThree.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.timeSection}>
                  <ThemedText
                    style={[
                      styles.departureTime,
                      { color: isDelayed ? Colors.light.delayed : theme.text },
                    ]}
                  >
                    {formatTime(dep.departureTime)}
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
                <View style={styles.statusSection}>
                  <ThemedText
                    type="body"
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
                      style={{ color: Colors.light.delayed }}
                    >
                      +{dep.delay}m delay
                    </ThemedText>
                  ) : null}
                </View>
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
    </>
  );

  return (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(400)}>
      {useGlass && Platform.OS === "ios" ? (
        <AnimatedPressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={animatedStyle}
        >
          <GlassView
            glassEffectStyle="regular"
            tintColor={Colors.light.primary + "12"}
            style={[styles.glassCard, { padding: Spacing.lg }]}
          >
            {cardContent}
          </GlassView>
        </AnimatedPressable>
      ) : (
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
          {cardContent}
        </AnimatedPressable>
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
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  timeSection: {
    flex: 1,
  },
  statusSection: {
    alignItems: "flex-end",
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
});
