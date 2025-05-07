// App.js

import 'react-native-reanimated'; 
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './screens/LoginScreen';
import { AppContext } from './contexts/AppContext';
import { SyncProvider, SyncBanner, QueueBanner, FailedSyncBanner, SyncFailureModal } from './contexts/SyncContext';
// Screens
import HomeScreen from './screens/HomeScreen';
import MasterCalendarScreen from './screens/MasterCalendarScreen';
import MachineScreen from './screens/MachineScreen';
import ChecklistScreen from './screens/ChecklistScreen';

// Create Navigators
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const MachinesStack = createNativeStackNavigator();

function MachinesStackNavigator() {
  return (
    <MachinesStack.Navigator screenOptions={{ headerShown: false }}>
      <MachinesStack.Screen name="Home" component={HomeScreen} />
      <MachinesStack.Screen name="MachineScreen" component={MachineScreen} />
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
      <SyncProvider>
        <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
  <NavigationContainer>
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={loginData ? 'MainTabs' : 'Login'}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
    </Stack.Navigator>
  </NavigationContainer>

  <StatusBar style="light" backgroundColor="#000" />


  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999 }}>
    <SyncBanner />
    
  </View>


  <FailedSyncBanner />
  <SyncFailureModal />
</GestureHandlerRootView>
        </SafeAreaProvider>
      </SyncProvider>
    </AppContext.Provider>
  );
  }
