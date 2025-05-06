import { View, Text, StyleSheet, Platform, StatusBar, Modal, TouchableOpacity } from 'react-native';
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
// Global setters (used by SyncManager or elsewhere)
export let setGlobalSyncing = () => {};
export let setGlobalSyncFailed = () => {};
export let acknowledgeSyncFailure = () => {};

const SyncContext = createContext();

export const SyncProvider = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncAcknowledged, setSyncAcknowledged] = useState(true);

  setGlobalSyncing = setIsSyncing;
  setGlobalSyncFailed = (fail = true) => {
    setSyncFailed(fail);
    setSyncAcknowledged(!fail);
  };
  acknowledgeSyncFailure = () => setSyncAcknowledged(true);

  return (
    <SyncContext.Provider value={{ isSyncing, setIsSyncing, syncFailed, syncAcknowledged }}>
      {children}
      <SyncFailureModal />
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);

// ---------------------------
// SYNC BANNER
// ---------------------------
export function SyncBanner() {
  const { isSyncing } = useSync();
  const dotCount = useRef(0);
  const [dots, setDots] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let delayTimer;
    if (isSyncing) {
      delayTimer = setTimeout(() => setShouldRender(true), 300);
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

// ---------------------------
// SYNC WARNING
// ---------------------------
export function SyncWarning() {
  const { isSyncing } = useSync();
  const dotCount = useRef(0);
  const [dots, setDots] = useState('');
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    let delayTimer;
    if (isSyncing) {
      delayTimer = setTimeout(() => setShouldRender(true), 300);
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
<View style={styles.warningBox}>
  <Text style={styles.syncText}>LOADING MAINFRAME{dots}</Text>
</View>
  );
}
// ---------------------------
// SYNC FAILURE MODAL
// ---------------------------
function SyncFailureModal() {
  const { syncFailed, syncAcknowledged } = useSync();

  if (!syncFailed || syncAcknowledged) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Sync Failed</Text>
          <Text style={styles.modalText}>Unable to complete sync operation. Check connection and try again.</Text>
          <TouchableOpacity style={styles.modalButton} onPress={acknowledgeSyncFailure}>
            <Text style={styles.modalButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------
// STYLES
// ---------------------------
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
    backgroundColor: '#000',       // solid black background
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
      warningText: {
    color: '#ff0',
    fontFamily: 'Courier',
    fontSize: 12,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#f00',
    padding: 20,
    borderRadius: 6,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Courier',
    fontSize: 18,
    color: '#f00',
    marginBottom: 10,
  },
  modalText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#0f0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  modalButtonText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#000',
  },
});
