import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AddRouteScreen from "@/screens/AddRouteScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type AddRouteStackParamList = {
  AddRoute: undefined;
};

const Stack = createNativeStackNavigator<AddRouteStackParamList>();

export default function AddRouteStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="AddRoute"
        component={AddRouteScreen}
        options={{
          title: "Add Route",
        }}
      />
    </Stack.Navigator>
  );
}
