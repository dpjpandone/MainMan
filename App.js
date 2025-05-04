// App.js

import 'react-native-reanimated'; 
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
import GestureSharedValueTest from './tests/GestureSharedValueTest';
import { SyncProvider, SyncBanner } from './contexts/SyncContext';
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
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Checklist"
        component={ChecklistScreen}
        options={{
          tabBarLabel: 'Checklist',
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
      <SyncProvider> {/* <-- wrap the whole app */}
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
  {typeof children === 'string' ? (
    <Text>{children}</Text>
  ) : (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="GestureTestScreen" component={GestureTestScreen} />
      <Stack.Screen name="GestureSharedValueTest" component={GestureSharedValueTest} />
    </Stack.Navigator>
  )}
</NavigationContainer>
            <StatusBar style="light" backgroundColor="#000" />
            <SyncBanner /> 
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </SyncProvider>
    </AppContext.Provider>
  );
}
