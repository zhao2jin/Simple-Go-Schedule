import React, { useState, useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { RouteCard } from "@/components/RouteCard";
import { EmptyState } from "@/components/EmptyState";
import { ReverseButton } from "@/components/ReverseButton";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ThemedText } from "@/components/ThemedText";
import { DonationModal } from "@/components/DonationModal";
import { CelebrationAnimation } from "@/components/CelebrationAnimation";
import { ServiceAlertBanner } from "@/components/ServiceAlertBanner";
import { useTheme } from "@/hooks/useTheme";
import { useDonation } from "@/hooks/useDonation";
import { Spacing } from "@/constants/theme";
import { getSavedRoutes, getReversedMode, setReversedMode, deleteRoute } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import type { SavedRoute, JourneyResult, ServiceAlert } from "@shared/types";

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

  // Fetch service alerts
  const { data: alertsData } = useQuery<{ alerts: ServiceAlert[] }>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      const response = await fetch("/api/alerts");
      return response.json();
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });

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
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
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
        {alertsData?.alerts && alertsData.alerts.length > 0 && (
          <ServiceAlertBanner
            alerts={alertsData.alerts}
            affectedRouteCodes={routes.flatMap(r => [r.originCode, r.destinationCode])}
          />
        )}
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
  const originName = isReversed ? route.destinationName : route.originName;
  const destName = isReversed ? route.originName : route.destinationName;

  const { data, isLoading } = useQuery<JourneyResult>({
    queryKey: ["/api/journey", `origin=${origin}`, `destination=${destination}`],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Route",
      `Remove ${originName} → ${destName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
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

  const handleDepartureTap = (tripNumber: string, origin: string, destination: string) => {
    navigation.navigate("TripDetail", {
      tripNumber,
      origin,
      destination,
    });
  };

  return (
    <Pressable onPress={onPress} onLongPress={handleLongPress} delayLongPress={500}>
      <RouteCard
        route={route}
        departures={data?.departures || []}
        isReversed={isReversed}
        hasAlert={data?.alerts && data.alerts.length > 0}
        onPress={() => {}}
        onDepartureTap={handleDepartureTap}
        index={index}
        isLoading={isLoading}
      />
    </Pressable>
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
    marginBottom: Spacing.lg,
  },
});
