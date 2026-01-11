import React from "react";
import { StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface ReverseButtonProps {
  isReversed: boolean;
  onToggle: () => void;
  bottomOffset: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ReverseButton({
  isReversed,
  onToggle,
  bottomOffset,
}: ReverseButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    rotation.value = withSpring(rotation.value + 180, { damping: 15 });
    onToggle();
  };

  return (
    <AnimatedPressable
      testID="button-reverse-direction"
      onPress={handlePress}
      style={[
        styles.button,
        {
          backgroundColor: isReversed ? Colors.light.primary : theme.backgroundDefault,
          borderColor: isReversed ? Colors.light.primary : theme.border,
          bottom: bottomOffset,
          shadowColor: "#000",
        },
        animatedStyle,
      ]}
    >
      <Feather
        name="repeat"
        size={20}
        color={isReversed ? "#fff" : theme.text}
      />
      <ThemedText
        type="caption"
        style={[
          styles.label,
          { color: isReversed ? "#fff" : theme.text },
        ]}
      >
        {isReversed ? "Home" : "Work"}
      </ThemedText>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontWeight: "600",
  },
});
