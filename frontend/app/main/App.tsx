// App.tsx
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Main from "./main";
import SolinPage from "./solinpage";

export type RootStackParamList = {
  Main: undefined;
  SolinPage: { solinId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={Main} />
        <Stack.Screen name="SolinPage" component={SolinPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
