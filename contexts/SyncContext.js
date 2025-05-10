import { View, Text, Platform, StatusBar, Modal, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { loadJobs, removeJob, markJobAsFailed, incrementRetry } from '../utils/JobQueue';
import { jobExecutors } from '../utils/jobExecutors';
import NetInfo from '@react-native-community/netinfo';

// Global setters (used outside component scope)
export let setGlobalSyncing = () => {};
export let setGlobalSyncFailed = () => {};
export let acknowledgeSyncFailure = () => {};
export let setGlobalQueuedJobCount = () => {};
export let setGlobalFailedJobs = () => {};

const SyncContext = createContext();


export const SyncProvider = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncAcknowledged, setSyncAcknowledged] = useState(true);
  const [queuedJobCount, setQueuedJobCount] = useState(0);
  const [failedJobs, setFailedJobs] = useState([]);

  setGlobalFailedJobs = setFailedJobs;
  setGlobalSyncing = setIsSyncing;
  setGlobalSyncFailed = (fail = true) => {
    setSyncFailed(fail);
    setSyncAcknowledged(!fail);
  };
  acknowledgeSyncFailure = () => setSyncAcknowledged(true);
  setGlobalQueuedJobCount = setQueuedJobCount;

  // ✅ TRIGGERS MUST BE INSIDE FUNCTION COMPONENT
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        console.log('[TRIGGER] App resumed – running sync queue');
        runSyncQueue();
      }
    });

    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[TRIGGER] Network reconnected – running sync queue');
        runSyncQueue();
      }
    });

    return () => {
      appStateListener.remove();
      netInfoUnsubscribe();
    };
  }, []);

  return (
    <SyncContext.Provider
    value={{
      isSyncing,
      setIsSyncing,
      syncFailed,
      syncAcknowledged,
      queuedJobCount,
      setQueuedJobCount,
      failedJobs,
    }}
        >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);


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
    <View>
      <Text>LOADING MAINFRAME{dots}</Text>
    </View>
  );
}
export function FailedSyncBanner() {
  const { failedJobs } = useSync();
  console.log('[CHECK] Current failedJobs:', failedJobs);
  if (!failedJobs || failedJobs.length === 0) return null;
  //console.log('[DEBUG] failedJobs in modal:', failedJobs);

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Upload Failed</Text>
          <Text style={styles.modalText}>
            {failedJobs.length} upload{failedJobs.length > 1 ? 's' : ''} failed to sync.
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                failedJobs.forEach(job => {
                  job.attemptCount = 0;
                  job.status = 'queued';
                });
                setGlobalFailedJobs([]);
                setGlobalQueuedJobCount(prev => prev + failedJobs.length);
                runSyncQueue(); // Retry now
              }}
              style={[styles.modalButton, { marginRight: 10 }]}
            >
              <Text style={styles.modalButtonText}>Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGlobalFailedJobs([])}
              style={[styles.modalButton, { backgroundColor: '#888' }]}
            >
              <Text style={[styles.modalButtonText, { color: '#fff' }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
// ---------------------------
// SYNC FAILURE MODAL
// ---------------------------
export function SyncFailureModal() {
  const { syncFailed, syncAcknowledged } = useSync();

  if (!syncFailed || syncAcknowledged) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Sync Failed</Text>
          <Text style={styles.modalText}>
            Unable to complete sync operation. Check connection and try again.
          </Text>
          <TouchableOpacity style={styles.modalButton} onPress={acknowledgeSyncFailure}>
            <Text style={styles.modalButtonText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------
// QUEUE RUNNER
// ---------------------------
export async function runSyncQueue() {
  await new Promise(res => setTimeout(res, 2000));
  const jobs = await loadJobs();
  let pending = 0;

  for (const job of jobs) {
   // job.attemptCount = 5; // ← force final attempt for testing UI
    if (!shouldRetry(job)) continue;

    pending++;

    try {
      console.log(`[QUEUE] Executing job ${job.id} (${job.label})`);

      const executor = jobExecutors[job.label];
      if (!executor) throw new Error(`No executor for label: ${job.label}`);

      await executor(job.payload);
      await removeJob(job.id);
      console.log(`[QUEUE] Job ${job.id} completed and removed`);
    } catch (err) {
      console.warn(`[QUEUE] Job ${job.id} failed`, err);
      await incrementRetry(job.id);

      if (job.attemptCount + 1 >= 5) {
        await markJobAsFailed(job.id);
        console.warn(`[QUEUE] Job ${job.id} permanently failed`);
     //setGlobalFailedJobs(prev => [...prev, job]);//for debugging UI
      }
    }
  }

  const updatedJobs = await loadJobs();
  setGlobalQueuedJobCount(updatedJobs.filter(j => j.status === 'queued').length);
}

function shouldRetry(job) {
  if (job.status === 'done' || job.status === 'failed') return false;
  if (job.attemptCount >= 5) return false;

  const baseDelay = 3000;
  const delay = baseDelay * Math.pow(2, job.attemptCount);
  const timeSinceLast = Date.now() - job.lastAttempt;

  return timeSinceLast >= delay;
}

///COMBINED SYNC BANNER///
export function CombinedSyncBanner() {
  const { isSyncing, queuedJobCount } = useSync();
  const [dots, setDots] = useState('');
  const dotCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      dotCount.current = (dotCount.current + 1) % 4;
      setDots('.'.repeat(dotCount.current));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const shouldRender = isSyncing || queuedJobCount > 0;
  if (!shouldRender) return null;

  let bannerText = '';
  if (isSyncing && queuedJobCount > 0) {
    bannerText = `SYNC IN PROGRESS (${queuedJobCount} job${queuedJobCount > 1 ? 's' : ''})${dots}`;
  } else if (isSyncing) {
    bannerText = `SYNC IN PROGRESS${dots}`;
  } else {
    bannerText = `QUEUE ACTIVE (${queuedJobCount} job${queuedJobCount > 1 ? 's' : ''})${dots}`;
  }

  const topPadding = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

  return (
    <View style={[styles.banner, { paddingTop: topPadding }]}>
      <Text style={styles.syncText}>{bannerText}</Text>
    </View>
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
