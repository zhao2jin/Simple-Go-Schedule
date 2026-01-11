import React, { useState, useEffect } from "react";
import { View, StyleSheet, Alert, Platform, Linking, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { StationPicker } from "@/components/StationPicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { saveRoute } from "@/lib/storage";
import { findNearestStation, haversineDistance, formatDistance } from "@/lib/location";
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
  const [nearestStation, setNearestStation] = useState<Station | undefined>();
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  const [permission, requestPermission] = Location.useForegroundPermissions();

  const { data: stationsData, isLoading: isLoadingStations } = useQuery<{
    stations: Station[];
  }>({
    queryKey: ["/api/stations"],
    staleTime: 1000 * 60 * 60,
  });

  const stations = stationsData?.stations || [];

  useEffect(() => {
    if (permission?.granted && !userLocation) {
      fetchLocation();
    }
  }, [permission?.granted]);

  useEffect(() => {
    if (userLocation && stations.length > 0) {
      const stationsWithCoords = stations.filter(s => s.latitude && s.longitude);
      if (stationsWithCoords.length > 0) {
        const nearest = findNearestStation(userLocation.lat, userLocation.lon, stationsWithCoords);
        setNearestStation(nearest);
      }
    }
  }, [userLocation, stations]);

  const fetchLocation = async () => {
    try {
      setLocationStatus("requesting");
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      });
      setLocationStatus("granted");
    } catch {
      setLocationStatus("denied");
    }
  };

  const handleRequestLocation = async () => {
    if (permission?.granted) {
      fetchLocation();
      return;
    }

    if (permission?.status === "denied" && !permission.canAskAgain) {
      if (Platform.OS !== "web") {
        try {
          await Linking.openSettings();
        } catch {
          Alert.alert("Settings", "Please enable location in your device settings.");
        }
      }
      return;
    }

    const result = await requestPermission();
    if (result.granted) {
      fetchLocation();
    } else {
      setLocationStatus("denied");
    }
  };

  const handleSelectNearestStation = () => {
    if (nearestStation) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setOrigin(nearestStation);
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
  const distanceToNearest = nearestStation && userLocation && nearestStation.latitude && nearestStation.longitude
    ? haversineDistance(userLocation.lat, userLocation.lon, nearestStation.latitude, nearestStation.longitude)
    : null;

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

      {!permission?.granted ? (
        <Pressable
          testID="button-enable-location"
          onPress={handleRequestLocation}
          style={[
            styles.locationBanner,
            {
              backgroundColor: Colors.light.primary + "15",
              borderColor: Colors.light.primary + "30",
            },
          ]}
        >
          <Feather name="map-pin" size={20} color={Colors.light.primary} />
          <View style={styles.locationBannerText}>
            <ThemedText type="caption" style={{ fontWeight: "600" }}>
              Enable location
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Auto-select the nearest station
            </ThemedText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </Pressable>
      ) : locationStatus === "requesting" ? (
        <View
          style={[
            styles.locationBanner,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="loader" size={20} color={theme.textSecondary} />
          <View style={styles.locationBannerText}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Finding your location...
            </ThemedText>
          </View>
        </View>
      ) : nearestStation && !origin ? (
        <Pressable
          testID="button-select-nearest"
          onPress={handleSelectNearestStation}
          style={[
            styles.nearestBanner,
            {
              backgroundColor: Colors.light.primary + "15",
              borderColor: Colors.light.primary + "30",
            },
          ]}
        >
          <Feather name="navigation" size={20} color={Colors.light.primary} />
          <View style={styles.locationBannerText}>
            <ThemedText type="caption" style={{ fontWeight: "600" }}>
              {nearestStation.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Nearest station{distanceToNearest ? ` (${formatDistance(distanceToNearest)})` : ""}
            </ThemedText>
          </View>
          <View style={[styles.useBadge, { backgroundColor: Colors.light.primary }]}>
            <ThemedText type="small" style={{ color: "#fff", fontWeight: "600" }}>
              Use
            </ThemedText>
          </View>
        </Pressable>
      ) : null}

      <View style={styles.form}>
        <StationPicker
          label="From (Morning)"
          value={origin}
          stations={stations}
          onSelect={setOrigin}
          placeholder={isLoadingStations ? "Loading stations..." : "Select origin station"}
          testID="picker-origin-station"
        />

        <StationPicker
          label="To (Morning)"
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
          testID="button-save-route"
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
  locationBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  nearestBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  locationBannerText: {
    flex: 1,
  },
  useBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
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
