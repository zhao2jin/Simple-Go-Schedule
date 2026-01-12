import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { StationPicker } from "@/components/StationPicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { saveRoute } from "@/lib/storage";
import { findNearestStation } from "@/lib/location";
import type { Station, SavedRoute } from "@shared/types";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";

export default function AddRouteScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation();

  const [origin, setOrigin] = useState<Station | undefined>();
  const [destination, setDestination] = useState<Station | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const locationRequestedRef = useRef(false);

  const [permission, requestPermission] = Location.useForegroundPermissions();

  const { data: stationsData, isLoading: isLoadingStations } = useQuery<{
    stations: Station[];
  }>({
    queryKey: ["/api/stations"],
    staleTime: 1000 * 60 * 60,
  });

  const stations = stationsData?.stations || [];

  useEffect(() => {
    if (locationRequestedRef.current) return;
    if (permission === null || permission === undefined) return;

    locationRequestedRef.current = true;

    if (permission.granted) {
      fetchLocation();
    } else if (permission.status !== "denied" || permission.canAskAgain) {
      requestPermission().then((result) => {
        if (result.granted) {
          fetchLocation();
        }
      });
    }
  }, [permission]);

  useEffect(() => {
    if (userLocation && stations.length > 0 && !origin) {
      const stationsWithCoords = stations.filter(s => s.latitude && s.longitude);
      if (stationsWithCoords.length > 0) {
        const nearest = findNearestStation(userLocation.lat, userLocation.lon, stationsWithCoords);
        if (nearest) {
          setOrigin(nearest);
        }
      }
    }
  }, [userLocation, stations, origin]);

  const fetchLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      });
    } catch {
    }
  };

  const handleSave = async () => {
    if (!origin || !destination) {
      Alert.alert("Missing Info", "Please select both origin and destination stations.");
      return;
    }

    if (origin.code === destination.code) {
      Alert.alert("Invalid Route", "Origin and destination must be different stations.");
      return;
    }

    setIsSaving(true);

    try {
      const newRoute: SavedRoute = {
        id: `${origin.code}-${destination.code}-${Date.now()}`,
        originCode: origin.code,
        originName: origin.name,
        destinationCode: destination.code,
        destinationName: destination.name,
        createdAt: Date.now(),
      };

      const saved = await saveRoute(newRoute);
      
      if (!saved) {
        Alert.alert(
          "Route Exists",
          "This route (or its reverse) is already saved."
        );
        setIsSaving(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setOrigin(undefined);
      setDestination(undefined);

      navigation.getParent()?.navigate("MyRoutesTab" as keyof MainTabParamList);
    } catch {
      Alert.alert("Error", "Failed to save route. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = origin && destination && origin.code !== destination.code;

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing["2xl"],
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        <ThemedText type="h3">Add Your Commute</ThemedText>
        <ThemedText
          type="body"
          style={[styles.subtitle, { color: theme.textSecondary }]}
        >
          Select your origin and destination stations. Use the reverse button on the home screen to swap directions.
        </ThemedText>
      </View>

      <View style={styles.form}>
        <StationPicker
          label="From"
          value={origin}
          stations={stations}
          onSelect={setOrigin}
          placeholder={isLoadingStations ? "Loading stations..." : "Select origin station"}
          testID="picker-origin-station"
        />

        <StationPicker
          label="To"
          value={destination}
          stations={stations}
          onSelect={setDestination}
          placeholder={isLoadingStations ? "Loading stations..." : "Select destination station"}
          testID="picker-destination-station"
        />
      </View>

      <View style={styles.footer}>
        <Button
          onPress={handleSave}
          disabled={!isValid || isSaving}
          style={styles.saveButton}
        >
          {isSaving ? "Saving..." : "Save Route"}
        </Button>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  subtitle: {
    marginTop: Spacing.sm,
  },
  form: {
    flex: 1,
  },
  footer: {
    marginTop: "auto",
  },
  saveButton: {
    marginTop: Spacing.lg,
  },
});
