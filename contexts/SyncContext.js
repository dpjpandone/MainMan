import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

// Global setter (used by SyncManager)
export let setGlobalSyncing = () => {};

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  setGlobalSyncing = setIsSyncing;

  return (
    <SyncContext.Provider value={{ isSyncing, setIsSyncing }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

export function SyncBanner() {
  const { isSyncing } = useSync();
  const dotCount = useRef(0);
  const [dots, setDots] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let delayTimer;

    if (isSyncing) {
      delayTimer = setTimeout(() => {
        setShouldRender(true);
      }, 300); // Delay rendering for 300ms
    } else {
      setShouldRender(false);
    }

    return () => clearTimeout(delayTimer);
  }, [isSyncing]);

  useEffect(() => {
    if (!shouldRender) return;
    const interval = setInterval(() => {
      dotCount.current = (dotCount.current + 1) % 4;
      setDots('.'.repeat(dotCount.current));
    }, 400);
    return () => clearInterval(interval);
  }, [shouldRender]);

  if (!shouldRender) return null;

  return (
    <View style={[styles.banner, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0 }]}>
      <Text style={styles.syncText}>SYNC IN PROGRESS{dots}</Text>
    </View>
  );
}
export function SyncWarning() {
  const { isSyncing } = useSync();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let delayTimer;

    if (isSyncing) {
      delayTimer = setTimeout(() => {
        setShouldRender(true);
      }, 300); // Delay rendering for 300ms
    } else {
      setShouldRender(false);
    }

    return () => clearTimeout(delayTimer);
  }, [isSyncing]);

  if (!shouldRender) return null;

  return (
    <View style={styles.warningBox}>
      <Text style={styles.warningText}>⚠ Data may be out of sync. Check connection.</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    width: '100%',
    backgroundColor: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#0f0',
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flexDirection: 'row',
  },
  syncText: {
    color: '#0f0',
    fontSize: 14,
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  warningBox: {
  backgroundColor: '#330',
  borderColor: '#ff0',
  borderWidth: 1,
  padding: 10,
  margin: 10,
  borderRadius: 4,
},
warningText: {
  color: '#ff0',
  fontFamily: 'Courier',
  fontSize: 12,
  textAlign: 'center',
},

});
