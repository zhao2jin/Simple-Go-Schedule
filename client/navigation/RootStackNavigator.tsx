import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import RouteDetailScreen from "@/screens/RouteDetailScreen";
import TripDetailScreen from "@/screens/TripDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  RouteDetail: {
    routeId: string;
    origin: string;
    destination: string;
  };
  TripDetail: {
    tripNumber: string;
    origin: string;
    destination: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RouteDetail"
        component={RouteDetailScreen}
        options={{
          presentation: "modal",
          headerTitle: "Route Details",
        }}
      />
      <Stack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{
          presentation: "modal",
          headerTitle: "Trip Details",
        }}
      />
    </Stack.Navigator>
  );
}
