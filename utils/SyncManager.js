// utils/SyncManager.js
import { setGlobalSyncing, setGlobalSyncFailed, setGlobalQueuedJobCount } from '../contexts/SyncContext';
import { loadJobs, removeJob, markJobAsFailed, incrementRetry } from './JobQueue';
import { jobExecutors } from './jobExecutors';
import { addJob } from './JobQueue';

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

    // 🔄 Let React render the sync banner if needed
    await new Promise((res) => setTimeout(res, 0));

    // 🐢 Development only: add network lag simulation (remove if unwanted)
     await new Promise((res) => setTimeout(res, 1000));

    return await fn();
  } catch (err) {
    console.error(`[SYNC ERROR] ${label}`, err);
    setGlobalSyncFailed(true); 
    throw err;
  } finally {
    endSync(label);
  }
}


export async function tryNowOrQueue(label, payload, { attempts = 3, delayMs = 1000 } = {}) {
  const executor = jobExecutors[label];

  if (!executor) {
    console.warn(`[SYNC] No executor found for label: ${label}`);
    return;
  }

  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`[SYNC] Attempt ${i + 1} for ${label}`);
      await executor(payload);
      console.log(`[SYNC] Job ${label} succeeded on attempt ${i + 1}`);
      return;
    } catch (err) {
      console.warn(`[SYNC] Attempt ${i + 1} failed for ${label}`, err);
      if (i < attempts - 1) {
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }

  console.warn(`[SYNC] All ${attempts} attempts failed — queueing job for ${label}`);
  await addJob(label, payload);
  console.log('[QUEUE] Job queued after retries failed:', { label, payload });

}
