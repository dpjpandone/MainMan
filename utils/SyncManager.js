// utils/SyncManager.js
import { Alert } from 'react-native';
import { setGlobalSyncing, setGlobalSyncFailed, setGlobalQueuedJobCount } from '../contexts/SyncContext';
import { addJob, loadJobs, removeJob, markJobAsFailed, incrementRetry } from './JobQueue';
import { jobExecutors } from './jobExecutors';
import { addInAppLog } from '../utils/InAppLogger';

const activeSyncs = {};

// Start a sync operation with a label
export function startSync(label = 'anonymous') {
  addInAppLog(`[SYNC START] ${label}`);
  activeSyncs[label] = Date.now();
  setGlobalSyncing(true);
}

// End a sync operation and check if any others are still running
export function endSync(label = 'anonymous') {
  if (activeSyncs[label]) {
    const duration = Date.now() - activeSyncs[label];
    addInAppLog(`[SYNC END] ${label} (${duration}ms)`);
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
    addInAppLog(`[SYNC] ${label} failed, triggering UI warning.`);
    setGlobalSyncFailed(true);
    return null; // 👈 prevent unhandled rejection
  } finally {
    endSync(label);
  }
}



/**
 * Attempts to run a job immediately, falling back to queue if it fails.
 *
 * @param {string} label - The job label (e.g. 'uploadProcedureFile').
 * @param {object} payload - The job-specific input data.
 * @param {object} [options] - Optional config for retries.
 * @param {number} [options.attempts=3] - Number of retry attempts before queuing.
 * @param {number} [options.delayMs=3000] - Delay between retry attempts (ms).
 * @returns {Promise<*>} The result from the executor on success, or null if queued.
 */
export async function tryNowOrQueue(label, payload, { attempts = 3, delayMs = 3000 } = {}) {
  const executor = jobExecutors[label];

  if (!executor) {
    Alert.alert('DEV: No job executor', `Label '${label}' is not registered.`);
    return;
  }

  for (let i = 0; i < attempts; i++) {
    try {
      addInAppLog(`[SYNC] Attempt ${i + 1} for ${label}`);
      const result = await executor(payload);
      addInAppLog(`[SYNC] Job ${label} succeeded on attempt ${i + 1}`);
      notifyJobComplete(label, payload);

      // ✅ Remove any matching job from queue
      const jobs = await loadJobs();

      // 🧹 Check for completed match and remove from queue
      const match = jobs.find(
        (j) => j.label === label && JSON.stringify(j.payload) === JSON.stringify(payload)
      );

      if (match) {
        await removeJob(match.id);
        addInAppLog(`[QUEUE] Removed job after success: ${label}`);
      }

      // 📊 Count remaining queued jobs using the same list
      const queuedCount = jobs.filter((j) => j.status === 'queued').length;
      addInAppLog(`[QUEUE] Queued job count: ${queuedCount}`);
      setGlobalQueuedJobCount(queuedCount);

      return result; // ✅ Must return result after success
    } catch (err) {
      console.warn(`[SYNC] Attempt ${i + 1} failed for ${label}`, err);
      if (i < attempts - 1) {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  // 💾 After all retries fail, persist the job if not already queued
  const existing = (await loadJobs()).find(
    j => j.label === label && JSON.stringify(j.payload) === JSON.stringify(payload)
  );

  if (existing) {
    addInAppLog(`[QUEUE] Job already queued: ${label}`);
    return null;
  }

  await addJob(label, payload);
  addInAppLog(`[QUEUE] Queued job: ${label}`);

  const jobs = await loadJobs();
  const queuedCount = jobs.filter((j) => j.status === 'queued').length;
  addInAppLog(`[QUEUE] Queued job count: ${queuedCount}`);
  setGlobalQueuedJobCount(queuedCount);

  return null;
}

const refreshCallbacks = new Set();

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
