import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";

interface CelebrationAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

const { width, height } = Dimensions.get("window");

const CONFETTI_COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#F38181", "#AA96DA"];
const CONFETTI_COUNT = 30;

function ConfettiPiece({ index, color }: { index: number; color: string }) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue((Math.random() - 0.5) * width);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const delay = Math.random() * 500;
    translateY.value = withDelay(delay, withTiming(height + 100, { duration: 2500 + Math.random() * 1000 }));
    rotation.value = withDelay(delay, withTiming(360 * (2 + Math.random() * 2), { duration: 2500 }));
    opacity.value = withDelay(delay + 1500, withTiming(0, { duration: 1000 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value + Math.sin(translateY.value / 50) * 30 },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const size = 8 + Math.random() * 8;
  const isCircle = Math.random() > 0.5;

  return (
    <Animated.View
      style={[
        styles.confetti,
        animatedStyle,
        {
          width: size,
          height: isCircle ? size : size * 2,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
          left: width / 2,
        },
      ]}
    />
  );
}

export function CelebrationAnimation({ visible, onComplete }: CelebrationAnimationProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const heartScale = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSequence(
        withSpring(1.2, { damping: 8 }),
        withSpring(1, { damping: 12 })
      );
      heartScale.value = withDelay(
        200,
        withSequence(
          withSpring(1.3, { damping: 6 }),
          withSpring(1, { damping: 10 })
        )
      );

      const timer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 500 }, () => {
          runOnJS(onComplete)();
        });
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      scale.value = 0;
      opacity.value = 0;
      heartScale.value = 0;
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, containerStyle]}>
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece
          key={i}
          index={i}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
        />
      ))}
      
      <Animated.View style={[styles.card, cardStyle, { backgroundColor: theme.backgroundDefault }]}>
        <Animated.View style={[styles.heartContainer, heartStyle]}>
          <Feather name="heart" size={48} color={Colors.light.primary} />
        </Animated.View>
        
        <ThemedText type="h2" style={styles.title}>
          Thank You!
        </ThemedText>
        
        <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]}>
          Your support means the world to us and helps keep Simply Go free for everyone.
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
    elevation: 100,
  },
  confetti: {
    position: "absolute",
    top: 0,
  },
  card: {
    width: "80%",
    maxWidth: 320,
    borderRadius: BorderRadius["2xl"],
    padding: Spacing["3xl"],
    alignItems: "center",
  },
  heartContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primary + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: "center",
    lineHeight: 22,
  },
});
