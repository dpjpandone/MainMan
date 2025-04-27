// App.js
// App.js
import 'react-native-reanimated'; // ✅ must be FIRST
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';


import HomeScreen from './screens/HomeScreen';
import MasterCalendarScreen from './screens/MasterCalendarScreen';
import MachineScreen from './screens/MachineScreen';
import ChecklistScreen from './screens/ChecklistScreen';
import UploadTestScreen from './screens/UploadTestScreen';
import GestureTestScreen from './screens/GestureTestScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MachinesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Machine" component={MachineScreen} />
      <Stack.Screen name="UploadTest" component={UploadTestScreen} />
      <Stack.Screen name="GestureTest" component={GestureTestScreen} />
    </Stack.Navigator>
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
          tabBarLabel: () => <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>Routine</Text>,
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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <TabNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});
