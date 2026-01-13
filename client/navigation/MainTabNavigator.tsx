import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform, StyleSheet, View } from "react-native";
import HomeStackNavigator from "@/navigation/HomeStackNavigator";
import AddRouteStackNavigator from "@/navigation/AddRouteStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";

export type MainTabParamList = {
  MyRoutesTab: undefined;
  AddRouteTab: undefined;
  ProfileTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function GlassTabBackground() {
  return (
    <GlassView
      glassEffectStyle="regular"
      tintColor={Colors.light.primary + "08"}
      style={StyleSheet.absoluteFill}
    />
  );
}

function BlurTabBackground() {
  const { isDark } = useTheme();
  return (
    <BlurView
      intensity={100}
      tint={isDark ? "dark" : "light"}
      style={StyleSheet.absoluteFill}
    />
  );
}

function SolidTabBackground() {
  const { theme } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundDefault }]} />
  );
}

function TabBarBackgroundComponent() {
  const { isDark } = useTheme();
  const useGlass = isLiquidGlassAvailable();
  
  if (Platform.OS !== "ios") {
    return <SolidTabBackground />;
  }
  
  if (useGlass && isDark) {
    return <GlassTabBackground />;
  }
  
  if (isDark) {
    return <BlurTabBackground />;
  }
  
  return <SolidTabBackground />;
}

export default function MainTabNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="MyRoutesTab"
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 0,
        },
        tabBarBackground: TabBarBackgroundComponent,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="MyRoutesTab"
        component={HomeStackNavigator}
        options={{
          title: "My Routes",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddRouteTab"
        component={AddRouteStackNavigator}
        options={{
          title: "Add Route",
          tabBarIcon: ({ color, size }) => (
            <Feather name="plus-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
