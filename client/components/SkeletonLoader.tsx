import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SkeletonLoaderProps {
  count?: number;
}

function SkeletonCard({ delay }: { delay: number }) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[styles.textSkeleton, { backgroundColor: theme.backgroundSecondary, width: "60%" }]}
        />
      </View>
      <View style={styles.content}>
        <View
          style={[styles.timeSkeleton, { backgroundColor: theme.backgroundSecondary }]}
        />
        <View
          style={[styles.timeSkeleton, { backgroundColor: theme.backgroundSecondary }]}
        />
        <View
          style={[styles.timeSkeleton, { backgroundColor: theme.backgroundSecondary }]}
        />
      </View>
    </Animated.View>
  );
}

export function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} delay={i * 200} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.lg,
  },
  card: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  textSkeleton: {
    height: 16,
    borderRadius: BorderRadius.xs,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeSkeleton: {
    width: 80,
    height: 52,
    borderRadius: BorderRadius.sm,
  },
});
