import { View, Text, StyleSheet, Platform, StatusBar } from 'react-native';
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
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

  useEffect(() => {
    if (!isSyncing) return;
    const interval = setInterval(() => {
      dotCount.current = (dotCount.current + 1) % 4;
      setDots('.'.repeat(dotCount.current));
    }, 400);
    return () => clearInterval(interval);
  }, [isSyncing]);

  if (!isSyncing) return null;

  return (
<View style={[styles.banner, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0 }]}>
<Text style={styles.syncText}>SYNC IN PROGRESS{dots}</Text>
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
      });
