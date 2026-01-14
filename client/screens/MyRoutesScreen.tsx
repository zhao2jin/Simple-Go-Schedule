import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { SwipeableRouteCard } from "@/components/SwipeableRouteCard";
import { EmptyState } from "@/components/EmptyState";
import { ReverseButton } from "@/components/ReverseButton";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { DonationModal } from "@/components/DonationModal";
import { CelebrationAnimation } from "@/components/CelebrationAnimation";
import { useTheme } from "@/hooks/useTheme";
import { useDonation } from "@/hooks/useDonation";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { getSavedRoutes, getReversedMode, setReversedMode } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import type { SavedRoute, JourneyResult } from "@shared/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyRoutesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const { showModal, trackUsage, checkAndShowPrompt, handleDonated, handleDismiss } = useDonation();

  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isReversed, setIsReversed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  const loadRoutes = useCallback(async () => {
    const savedRoutes = await getSavedRoutes();
    const reversed = await getReversedMode();
    setRoutes(savedRoutes);
    setIsReversed(reversed);
    setIsInitialLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutes();
      checkAndShowPrompt();
    }, [loadRoutes, checkAndShowPrompt])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadRoutes();
    queryClient.invalidateQueries({ queryKey: ["/api/journey"] });
    setIsRefreshing(false);
  };

  const handleToggleReverse = async () => {
    const newValue = !isReversed;
    setIsReversed(newValue);
    await setReversedMode(newValue);
  };

  const handleRoutePress = async (route: SavedRoute) => {
    await trackUsage();
    
    const origin = isReversed ? route.destinationCode : route.originCode;
    const destination = isReversed ? route.originCode : route.destinationCode;
    const originName = isReversed ? route.destinationName : route.originName;
    const destName = isReversed ? route.originName : route.destinationName;

    navigation.navigate("RouteDetail", {
      routeId: route.id,
      origin: `${originName}|${origin}`,
      destination: `${destName}|${destination}`,
    });
  };

  const handleRouteDelete = () => {
    loadRoutes();
  };

  const navigateToAddRoute = () => {
    navigation.getParent()?.navigate("AddRouteTab" as keyof MainTabParamList);
  };

  if (isInitialLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: insets.top + Spacing.xl,
          },
        ]}
      >
        <View style={styles.content}>
          <SkeletonLoader count={3} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing["4xl"],
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={theme.text}
          />
        }
      >
        {routes.length === 0 ? (
          <EmptyState
            title="No Routes Yet"
            description="Add your first commute route to see upcoming train times at a glance."
            actionLabel="Add Route"
            onAction={navigateToAddRoute}
          />
        ) : (
          <>
            <View style={styles.header}>
              <ThemedText type="h3">My Routes</ThemedText>
              <Pressable
                onPress={handleRefresh}
                style={({ pressed }) => [
                  styles.refreshButton,
                  { 
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                    opacity: pressed ? 0.7 : 1 
                  },
                ]}
              >
                <Feather name="refresh-cw" size={18} color={Colors.light.primary} />
              </Pressable>
            </View>
            {routes.map((route, index) => (
              <RouteCardWithData
                key={route.id}
                route={route}
                isReversed={isReversed}
                onPress={() => handleRoutePress(route)}
                onDelete={handleRouteDelete}
                index={index}
              />
            ))}
          </>
        )}
      </ScrollView>

      {routes.length > 0 ? (
        <ReverseButton
          isReversed={isReversed}
          onToggle={handleToggleReverse}
          bottomOffset={tabBarHeight + Spacing.xl + insets.bottom}
        />
      ) : null}

      <DonationModal
        visible={showModal}
        onClose={handleDismiss}
        onDonated={() => {
          handleDonated();
          setShowCelebration(true);
        }}
      />

      <CelebrationAnimation
        visible={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </View>
  );
}

function RouteCardWithData({
  route,
  isReversed,
  onPress,
  onDelete,
  index,
}: {
  route: SavedRoute;
  isReversed: boolean;
  onPress: () => void;
  onDelete: () => void;
  index: number;
}) {
  const origin = isReversed ? route.destinationCode : route.originCode;
  const destination = isReversed ? route.originCode : route.destinationCode;

  const { data, isLoading } = useQuery<JourneyResult>({
    queryKey: ["/api/journey", `origin=${origin}`, `destination=${destination}`],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  return (
    <SwipeableRouteCard
      route={route}
      departures={data?.departures || []}
      isReversed={isReversed}
      hasAlert={data?.alerts && data.alerts.length > 0}
      onPress={onPress}
      onDelete={onDelete}
      index={index}
      isLoading={isLoading}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
