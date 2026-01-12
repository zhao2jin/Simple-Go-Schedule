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

const useGlass = isLiquidGlassAvailable();

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

function AndroidTabBackground() {
  const { theme } = useTheme();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.backgroundRoot }]} />
  );
}

const TabBarBackground = Platform.OS === "ios" 
  ? (useGlass ? GlassTabBackground : BlurTabBackground)
  : AndroidTabBackground;

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
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: TabBarBackground,
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
