import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyRoutesScreen from "@/screens/MyRoutesScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type HomeStackParamList = {
  MyRoutes: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MyRoutes"
        component={MyRoutesScreen}
        options={{
          headerTitle: () => <HeaderTitle title="GO Tracker" />,
        }}
      />
    </Stack.Navigator>
  );
}
