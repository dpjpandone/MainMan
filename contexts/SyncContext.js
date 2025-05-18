import { View, Text, Platform, StatusBar, Modal, TouchableOpacity, StyleSheet, AppState } from 'react-native';
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { loadJobs, removeJob, markJobAsFailed, incrementRetry } from '../utils/JobQueue';
import { jobExecutors } from '../utils/jobExecutors';
import NetInfo from '@react-native-community/netinfo';
import { addInAppLog } from '../utils/InAppLogger';
import { notifyJobComplete } from '../utils/SyncManager';
import { PendingHourglass } from '../styles/globalStyles';
import { getDevForceAllJobFailures } from '../utils/SyncManager';
import { MUTATION_LABELS } from '../utils/SyncManager';

// Global setters (used outside component scope)
export let setGlobalSyncing = () => {};
export let setGlobalSyncFailed = () => {};
export let acknowledgeSyncFailure = () => {};
export let setGlobalQueuedJobCount = () => {};
export let setGlobalFailedJobs = () => {};
export let setGlobalStaleData = () => {};

export let getNextRetryMs = () => 0;

function updateNextRetryMs(jobs = []) {
  const now = Date.now();
  let minWait = Infinity;

  for (const job of jobs) {
    if (job.status !== 'queued') continue;
    const baseDelay = 3000;
    const delay = baseDelay * Math.pow(2, job.attemptCount);
    const timeUntil = delay - (now - job.lastAttempt);
    if (timeUntil > 0) minWait = Math.min(minWait, timeUntil);
  }

  getNextRetryMs = () => Math.max(0, Math.floor(minWait));
}


const SyncContext = createContext();
// Fetch retry subscription system
const reconnectListeners = new Set();

export function subscribeToReconnect(callback) {
  reconnectListeners.add(callback);
  return () => reconnectListeners.delete(callback);
}

export const SyncProvider = ({ children }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);
  const [queuedJobCount, setQueuedJobCount] = useState(0);
  const [failedJobs, setFailedJobs] = useState([]);
  const [hasStaleData, setHasStaleData] = useState(false); // ✅ for hourglass
  const [syncAcknowledged, setSyncAcknowledged] = useState(true); // ✅ for hourglass hiding

  // 🔧 Global setter bindings
setGlobalFailedJobs = setFailedJobs;
setGlobalSyncing = setIsSyncing;
setGlobalSyncFailed = (fail = true) => setSyncFailed(fail);
acknowledgeSyncFailure = (ack = true) => {
  addInAppLog(`[SYNCCTX] Setting acknowledged = ${ack}`);
  setSyncAcknowledged(ack);
};
setGlobalQueuedJobCount = setQueuedJobCount;
setGlobalStaleData = setHasStaleData;

  // 📡 Trigger queue runner when app resumes or reconnects
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', (state) => {
      addInAppLog(`[TRIGGER] AppState changed to ${state}`);
      if (state === 'active') {
        addInAppLog('[TRIGGER] App resumed — running sync queue');
        runSyncQueue();
      }
    });

    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      addInAppLog(`[TRIGGER] NetInfo: isConnected = ${state.isConnected}`);
if (state.isConnected) {
  addInAppLog('[TRIGGER] Network reconnected — running sync queue');
  runSyncQueue();

  addInAppLog('[TRIGGER] Notifying reconnect listeners');
  reconnectListeners.forEach(cb => {
    try {
      cb();
    } catch (err) {
      addInAppLog(`[TRIGGER] Reconnect listener failed: ${err.message}`);
    }
  });
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
        queuedJobCount,
        setQueuedJobCount,
        failedJobs,
        hasStaleData,
        syncAcknowledged, 
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);


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
  onPress={async () => {
    for (const job of failedJobs) {
      await removeJob(job.id); // ✅ Remove from storage
      addInAppLog(`[DISMISS] Removed failed job: ${job.label}`);
    }
    setGlobalFailedJobs([]);           // ✅ Clear from memory
    acknowledgeSyncFailure(true);      // ✅ Suppress stale indicators
  }}
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
// QUEUE RUNNER
// ---------------------------
export async function runSyncQueue() {
  addInAppLog('[RUNNER] runSyncQueue() triggered'); // 🔍 proves queue fired

  await new Promise(res => setTimeout(res, 2000));
  const jobs = await loadJobs();
  addInAppLog(`[RUNNER] Loaded jobs: ${jobs.length}`);

  for (const job of jobs) {
if (!shouldRetry(job)) {
  addInAppLog(`[RUNNER] Skipped job ${job.id} (${job.label}) — not retryable`);
  
  // 🔴 Mark job as permanently failed
  await markJobAsFailed(job.id);
  addInAppLog(`[RUNNER] Job ${job.id} permanently failed`);

  // 🧠 Update global sync state for banner display
  const failed = await loadJobs();
  const failedJobs = failed.filter(j => j.status === 'failed');
  setGlobalFailedJobs(failedJobs);
  setGlobalSyncFailed(true);
  acknowledgeSyncFailure(false);

  continue; // or return if you're only running one job
}

    try {
      addInAppLog(`[RUNNER] Executing job ${job.id} (${job.label})`);
      const executor = jobExecutors[job.label];
      if (!executor) throw new Error(`No executor for label: ${job.label}`);

      ///force sync failure
if (getDevForceAllJobFailures() && MUTATION_LABELS.has(job.label)) {
  addInAppLog(`[RUNNER] ❌ Forced failure during queue retry: ${job.label}`);
  throw new Error(`[FORCED FAIL] runSyncQueue failed: ${job.label}`);
}

      await executor(job.payload);
      addInAppLog(`[RUNNER] Executor finished: ${job.label}`);

      await removeJob(job.id);
      addInAppLog(`[RUNNER] Job removed from queue: ${job.id}`);

      notifyJobComplete(job.label, job.payload);
      addInAppLog(`[RUNNER] notifyJobComplete() fired for: ${job.label}`);
    } catch (err) {
      addInAppLog(`[RUNNER] Job ${job.id} failed: ${err?.message || err}`);
      await incrementRetry(job.id);

if (job.attemptCount + 1 >= 5) {
  await markJobAsFailed(job.id);
  addInAppLog(`[RUNNER] Job ${job.id} permanently failed`);

  const failed = await loadJobs();                          // ✅ Needed
  const failedJobs = failed.filter(j => j.status === 'failed');  // ✅ Needed
  setGlobalFailedJobs(failedJobs);
  setGlobalSyncFailed(true);
  acknowledgeSyncFailure(false);
     }
    }
  }

  const updatedJobs = await loadJobs();
  const remaining = updatedJobs.filter(j => j.status === 'queued').length;
  setGlobalQueuedJobCount(remaining);
  addInAppLog(`[RUNNER] Remaining queued jobs: ${remaining}`);
}

function shouldRetry(job) {
  if (job.status === 'done' || job.status === 'failed') return false;
  if (job.attemptCount >= 5) return false;

  const baseDelay = 3000;
  const delay = baseDelay * Math.pow(2, job.attemptCount);
  const timeSinceLast = Date.now() - job.lastAttempt;

  return timeSinceLast >= delay;
}

export function StaleDataOverlay({ style = {}, centered = false }) {
  
const { isSyncing, hasStaleData, syncAcknowledged, queuedJobCount } = useSync();
  const [visible, setVisible] = useState(false);
  const startTimeRef = useRef(null);
  const timeoutRef = useRef(null);

  const staleRef = useRef(hasStaleData);
  const ackRef = useRef(syncAcknowledged);
  const hasLoggedVisibility = useRef(null);

  useEffect(() => {
    staleRef.current = hasStaleData;
    ackRef.current = syncAcknowledged;
    addInAppLog(`[HOURGLASS] ⏱️ updated refs → stale=${hasStaleData}, acknowledged=${syncAcknowledged}`);
  }, [hasStaleData, syncAcknowledged]);

  useEffect(() => {
    if (isSyncing) {
      startTimeRef.current = Date.now();
      setVisible(true);
      hasLoggedVisibility.current = true;
      addInAppLog(`[HOURGLASS] 🔄 isSyncing = true → hourglass ON`);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      const elapsed = Date.now() - (startTimeRef.current || 0);
      const remaining = 1250 - elapsed;
      addInAppLog(`[HOURGLASS] ✅ isSyncing = false → elapsed=${elapsed}, remaining delay=${remaining}`);

      const evaluate = () => {
        const stillStale = staleRef.current && !ackRef.current;
        addInAppLog(`[HOURGLASS] 🔍 Delay complete — evaluating: stale=${staleRef.current}, acknowledged=${ackRef.current}, stayVisible=${stillStale}`);
        setVisible(stillStale);
        hasLoggedVisibility.current = stillStale;
      };

      if (remaining > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(evaluate, remaining);
      } else {
        evaluate();
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      addInAppLog(`[HOURGLASS] 🧹 Cleanup timeout`);
    };
  }, [isSyncing]);

  useEffect(() => {
    addInAppLog(`[HOURGLASS] 🧠 Mounted`);
    return () => addInAppLog(`[HOURGLASS] 🧼 Unmounted`);
  }, []);


const shouldShow = visible || queuedJobCount > 0;
if (!shouldShow) return null;

 return (
    <View
      style={[
        !centered && {
          position: 'absolute',
          top: 23,
          right: 8,
          zIndex: 10000,
        },
        style,
      ]}
    >
      <PendingHourglass centered={centered} />
    </View>
  );
}

//COMBINED SYNC BANNER
export function CombinedSyncBanner() {
  const { queuedJobCount, isSyncing } = useSync();
  const [dots, setDots] = useState('');
  const [retryCountdown, setRetryCountdown] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  const dotCount = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      dotCount.current = (dotCount.current + 1) % 4;
      setDots('.'.repeat(dotCount.current));

      const ms = getNextRetryMs?.() ?? 0;
      setRetryCountdown(ms > 0 ? Math.ceil(ms / 1000) : null);
    }, 564);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (queuedJobCount <= 0) return null;

  let baseText = '';
  if (isSyncing) {
    baseText = `SYNCING (${queuedJobCount} job${queuedJobCount > 1 ? 's' : ''})`;
  } else if (!isConnected) {
    baseText = `WAITING FOR CONNECTION`;
  } else if (retryCountdown !== null) {
    baseText = `${queuedJobCount} JOB${queuedJobCount > 1 ? 'S' : ''} — RETRYING IN ${retryCountdown}s`;
  } else {
    baseText = `QUEUE ACTIVE (${queuedJobCount} job${queuedJobCount > 1 ? 's' : ''})`;
  }

  const bannerText = `${baseText}${dots}`;
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
