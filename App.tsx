import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import './src/global.css';

import ModelConfigurationScreen from './src/screens/ModelConfigurationScreen';
import FabricUploadScreen from './src/screens/FabricUploadScreen';
import PreviewScreen from './src/screens/PreviewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Stack.Screen name="ModelConfiguration" component={ModelConfigurationScreen} />
        <Stack.Screen name="FabricUpload" component={FabricUploadScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
