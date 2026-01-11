import React, { useState, useCallback, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { RouteCard } from "@/components/RouteCard";
import { EmptyState } from "@/components/EmptyState";
import { ReverseButton } from "@/components/ReverseButton";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { getSavedRoutes, getReversedMode, setReversedMode } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import type { SavedRoute, JourneyResult } from "@shared/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MyRoutesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [routes, setRoutes] = useState<SavedRoute[]>([]);
  const [isReversed, setIsReversed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

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
    }, [loadRoutes])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadRoutes();
    setIsRefreshing(false);
  };

  const handleToggleReverse = async () => {
    const newValue = !isReversed;
    setIsReversed(newValue);
    await setReversedMode(newValue);
  };

  const handleRoutePress = (route: SavedRoute) => {
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
            paddingTop: headerHeight + Spacing.xl,
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
            paddingTop: headerHeight + Spacing.xl,
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
          routes.map((route, index) => (
            <RouteCardWithData
              key={route.id}
              route={route}
              isReversed={isReversed}
              onPress={() => handleRoutePress(route)}
              index={index}
            />
          ))
        )}
      </ScrollView>

      {routes.length > 0 ? (
        <ReverseButton
          isReversed={isReversed}
          onToggle={handleToggleReverse}
          bottomOffset={tabBarHeight + Spacing.xl}
        />
      ) : null}
    </View>
  );
}

function RouteCardWithData({
  route,
  isReversed,
  onPress,
  index,
}: {
  route: SavedRoute;
  isReversed: boolean;
  onPress: () => void;
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
    <RouteCard
      route={route}
      departures={data?.departures || []}
      isReversed={isReversed}
      hasAlert={data?.alerts && data.alerts.length > 0}
      onPress={onPress}
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
});
