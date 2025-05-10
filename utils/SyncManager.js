// utils/SyncManager.js
import { Alert } from 'react-native';
import { setGlobalSyncing, setGlobalSyncFailed, setGlobalQueuedJobCount } from '../contexts/SyncContext';
import { addJob, loadJobs, removeJob, markJobAsFailed, incrementRetry } from './JobQueue';
import { jobExecutors } from './jobExecutors';
import { addInAppLog } from '../utils/InAppLogger';

const activeSyncs = {};

// Start a sync operation with a label
export function startSync(label = 'anonymous') {
  console.log(`[SYNC START] ${label}`);
  activeSyncs[label] = Date.now();
  setGlobalSyncing(true);
}

// End a sync operation and check if any others are still running
export function endSync(label = 'anonymous') {
  if (activeSyncs[label]) {
    const duration = Date.now() - activeSyncs[label];
    console.log(`[SYNC END] ${label} (${duration}ms)`);
    delete activeSyncs[label];
    if (Object.keys(activeSyncs).length === 0) {
      setGlobalSyncing(false);
    }
  }
}

// Wrap an async function to auto-handle sync state and duration logging
export async function wrapWithSync(label, fn) {
  try {
    startSync(label);
    await new Promise((res) => setTimeout(res, 0));
    return await fn();
  } catch (err) {
    console.log(`[SYNC] ${label} failed, triggering UI warning.`);
    setGlobalSyncFailed(true);
    return null; // 👈 prevent unhandled rejection
  } finally {
    endSync(label);
  }
}



export async function tryNowOrQueue(label, payload, { attempts = 3, delayMs = 3000 } = {}) {
  const executor = jobExecutors[label];

  if (!executor) {
    Alert.alert('DEV: No job executor', `Label '${label}' is not registered.`);
    return;
  }


  for (let i = 0; i < attempts; i++) {
    try {
      addInAppLog(`[SYNC] Attempt ${i + 1} for ${label}`);
      const result = await executor(payload); // 👈 capture and return result
      addInAppLog(`[SYNC] Job ${label} succeeded on attempt ${i + 1}`);
      notifyJobComplete(label, payload);
      return result; // ✅ now MachineScreen gets 'duplicate'
    } catch (err) {
      console.warn(`[SYNC] Attempt ${i + 1} failed for ${label}`, err);
      if (i < attempts - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }
  
  await addJob(label, payload);
  addInAppLog(`[QUEUE] Queued job: ${label}`);

  const jobs = await loadJobs();
  addInAppLog(`[QUEUE] Queued job count: ${jobs.filter(j => j.status === 'queued').length}`);

  setGlobalQueuedJobCount(jobs.filter(j => j.status === 'queued').length);

}


const refreshCallbacks = new Set();

/**
 * Subscribe to job completion events.
 * @param {function} callback - A function to run after a job completes.
 * @returns {function} A cleanup function to unsubscribe the callback.
 */
export function subscribeToJobComplete(callback) {
  if (typeof callback === 'function') {
    addInAppLog('[SUBSCRIBE] Listener registered');
    refreshCallbacks.add(callback);
  }

  // Return cleanup function
  return () => {
    refreshCallbacks.delete(callback);
  };
}

/**
 * Notify all subscribers that a job has completed.
 * @param {string} label - The job label (e.g. 'markProcedureComplete').
 * @param {object} payload - The payload originally passed to the job.
 */
export function notifyJobComplete(label, payload) {
  addInAppLog(`[NOTIFY] Job complete: ${label}`);
  addInAppLog(`[NOTIFY] Callbacks count: ${refreshCallbacks.size}`);

  for (const cb of refreshCallbacks) {
    try {
      cb(label, payload);
    } catch (err) {
      addInAppLog(`[ERROR] Callback failed for ${label}`);
    }
  }
}
