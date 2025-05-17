// App.js

import 'react-native-reanimated';
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import { AppContext } from './contexts/AppContext';
import { SyncProvider, CombinedSyncBanner, FailedSyncBanner } from './contexts/SyncContext';
import { registerLogListener, unregisterLogListener, clearInAppLogs, pushLogsToSupabase, LOGGING_ENABLED } from './utils/InAppLogger';
import { setGlobalStaleData } from './contexts/SyncContext';
import { StaleDataOverlay } from './contexts/SyncContext';


// Screens
import HomeScreen from './screens/HomeScreen';
import MasterCalendarScreen from './screens/MasterCalendarScreen';
import MachineScreen from './screens/MachineScreen';
import ChecklistScreen from './screens/ChecklistScreen';

// Logger UI component
function InAppLogger() {
  const [logs, setLogs] = useState([]);
  const [visible, setVisible] = useState(true);

useEffect(() => {
  if (!LOGGING_ENABLED) return;

  registerLogListener(setLogs);


  return () => unregisterLogListener();
}, []);

  if (!visible) {
    return (
      <TouchableOpacity
        onPress={() => setVisible(true)}
        style={styles.toggleButton}
      >
        <Text style={styles.toggleText}>🪵</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.logContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        <TouchableOpacity onPress={() => setVisible(false)} style={styles.collapseButton}>
          <Text style={styles.collapseText}>✖</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity onPress={clearInAppLogs} style={styles.clearButton}>
            <Text style={styles.clearText}>🧹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={async () => {
              await pushLogsToSupabase(logs, 'ManualPush', 'devkit');
            }}
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>📤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.logBox}>
        {logs.map((log, idx) => (
          <Text key={idx} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

// Navigators
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
            <CombinedSyncBanner />
            <StaleDataOverlay />
            <FailedSyncBanner />
            {LOGGING_ENABLED && <InAppLogger />}
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </SyncProvider>
    </AppContext.Provider>
  );
}

// Logger styles
const styles = StyleSheet.create({
  logContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: 140,
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 6,
    paddingTop: 20,
    zIndex: 9999,
  },
  logBox: {
    flex: 1,
  },
  logText: {
    color: '#0f0',
    fontSize: 10,
    fontFamily: 'Courier',
  },
  collapseButton: {
    position: 'absolute',
    top: 2,
    right: 4,
    zIndex: 1,
  },
  collapseText: {
    color: '#f00',
    fontSize: 14,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#000',
    borderColor: '#0f0',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    zIndex: 9999,
  },
  toggleText: {
    color: '#0f0',
    fontSize: 16,
  },
});
