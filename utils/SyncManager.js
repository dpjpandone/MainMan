// utils/SyncManager.js
import { Alert } from 'react-native';
import { setGlobalSyncing, setGlobalSyncFailed, setGlobalQueuedJobCount, setGlobalStaleData, acknowledgeSyncFailure } from '../contexts/SyncContext';
import { addJob, loadJobs, removeJob, markJobAsFailed, incrementRetry } from './JobQueue';
import { jobExecutors } from './jobExecutors';
import { addInAppLog } from '../utils/InAppLogger';

const activeSyncs = {};

export const MUTATION_LABELS = new Set([
  'markProcedureComplete',
  'addProcedure',
  'updateProcedureSettings',
  'uploadProcedureImage',
  'uploadProcedureFile',
  'saveProcedureDescription',
  'updateMachineShop',
  'setImageCaptionDeferred',
]);


///syync failure dev toggle
let DEV_FORCE_ALL_JOB_FAILURES = false;

export function setDevForceAllJobFailures(enabled) {
  DEV_FORCE_ALL_JOB_FAILURES = enabled;
}

export function getDevForceAllJobFailures() {
  return DEV_FORCE_ALL_JOB_FAILURES;
}

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

export async function wrapWithSync(label, fn, options = {}) {
  const { critical = false } = options;

  try {
    startSync(label);
    await new Promise((res) => setTimeout(res, 0));

    const result = await fn();

    // ✅ Sync succeeded — clear stale + failure state
    addInAppLog(`[SYNC] ${label} succeeded — clearing sync failure flag`);
    setGlobalSyncFailed(false);
    setGlobalStaleData(false);

    setTimeout(() => {
      console.log(`[STATE CHECK] isSyncing should be false`);
      console.log(`[STATE CHECK] syncFailed should be false`);
    }, 500);

    return result;

  } catch (err) {
    addInAppLog(`[WRAP] ${label} failed — entering catch`);

    setGlobalSyncFailed(true);
    setGlobalStaleData(true);
    acknowledgeSyncFailure(false); // ✅ Correct global setter
    addInAppLog(`[WRAP] Marked as stale + unacknowledged`);

    console.log(`[WRAP CATCH] ${label} failed — stale flag set`);
    addInAppLog(`[STALE] ${label} failed — marking data as stale`);

    if (critical) {
      addInAppLog(`[CRITICAL] This sync failure was marked critical.`);
    }

    return null;
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

       // 🔥 DEV FAILURE INJECTION
      if (getDevForceAllJobFailures() && MUTATION_LABELS.has(label)) {
        addInAppLog(`[SYNC] ❌ Forced failure triggered for: ${label}`);
        throw new Error(`[FORCED FAIL] tryNowOrQueue is set to fail mutate: ${label}`);
      }

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
