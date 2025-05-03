// App.js

import 'react-native-reanimated'; // ✅ must be FIRST
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import { AppContext } from './contexts/AppContext';

// Screens
import HomeScreen from './screens/HomeScreen';
import MasterCalendarScreen from './screens/MasterCalendarScreen';
import MachineScreen from './screens/MachineScreen';
import ChecklistScreen from './screens/ChecklistScreen';
import UploadTestScreen from './screens/UploadTestScreen';
import GestureTestScreen from './screens/GestureTestScreen';

// Create Navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const MachinesStack = createNativeStackNavigator();

function MachinesStackNavigator() {
  return (
    <MachinesStack.Navigator screenOptions={{ headerShown: false }}>
      <MachinesStack.Screen name="Home" component={HomeScreen} />
      <MachinesStack.Screen name="MachineScreen" component={MachineScreen} />
      <MachinesStack.Screen name="UploadTest" component={UploadTestScreen} />
      <MachinesStack.Screen name="GestureTest" component={GestureTestScreen} />
    </MachinesStack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          paddingBottom: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#0f0',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen
        name="Machines"
        component={MachinesStackNavigator}
        options={{
          tabBarLabel: () => (
            <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>Routine</Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="tools" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={MasterCalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="clipboard-check-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [loginData, setLoginData] = useState(null);

  return (
    <AppContext.Provider value={{ loginData, setLoginData }}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
  <Stack.Screen name="Login" component={LoginScreen} />
  <Stack.Screen name="MainTabs" component={TabNavigator} />
  <Stack.Screen name="GestureTestScreen" component={GestureTestScreen} />
</Stack.Navigator>
          </NavigationContainer>
          <StatusBar style="light" backgroundColor="#000" />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </AppContext.Provider>
  );
}
