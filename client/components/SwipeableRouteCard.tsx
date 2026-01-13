import React from "react";
import { View, StyleSheet, Alert, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { RouteCard } from "@/components/RouteCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { deleteRoute } from "@/lib/storage";
import type { SavedRoute, Departure } from "@shared/types";

interface SwipeableRouteCardProps {
  route: SavedRoute;
  departures: Departure[];
  isReversed: boolean;
  hasAlert?: boolean;
  onPress: () => void;
  onDelete: () => void;
  index: number;
  isLoading?: boolean;
}

const SWIPE_THRESHOLD = -80;
const DELETE_THRESHOLD = -150;

export function SwipeableRouteCard({
  route,
  departures,
  isReversed,
  hasAlert,
  onPress,
  onDelete,
  index,
  isLoading,
}: SwipeableRouteCardProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);

  const confirmDelete = () => {
    Alert.alert(
      "Delete Route",
      `Are you sure you want to delete this route?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            translateX.value = withSpring(0);
            deleteOpacity.value = withTiming(0);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteRoute(route.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onDelete();
          },
        },
      ]
    );
  };

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      const newTranslateX = Math.min(0, event.translationX);
      translateX.value = newTranslateX;
      deleteOpacity.value = Math.min(1, Math.abs(newTranslateX) / Math.abs(SWIPE_THRESHOLD));
    })
    .onEnd((event) => {
      if (event.translationX < DELETE_THRESHOLD) {
        translateX.value = withTiming(-400, { duration: 200 });
        runOnJS(confirmDelete)();
      } else if (event.translationX < SWIPE_THRESHOLD) {
        translateX.value = withSpring(SWIPE_THRESHOLD);
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        translateX.value = withSpring(0);
        deleteOpacity.value = withTiming(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.deleteBackground,
          { backgroundColor: Colors.light.delayed },
          deleteStyle,
        ]}
      >
        <Feather name="trash-2" size={24} color="#fff" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={cardStyle}>
          <RouteCard
            route={route}
            departures={departures}
            isReversed={isReversed}
            hasAlert={hasAlert}
            onPress={onPress}
            index={index}
            isLoading={isLoading}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: Spacing.lg,
    width: 100,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
});
