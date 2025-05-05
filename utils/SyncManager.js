// utils/SyncManager.js
import { setGlobalSyncing } from '../contexts/SyncContext';

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
  
      // 🔄 Allow React a render pass to display the sync banner
      await new Promise((res) => setTimeout(res, 0));
  
      // 🐢 Simulate network lag during development
      await new Promise((res) => setTimeout(res, 0));
  
      return await fn();
    } catch (err) {
      console.error(`[SYNC ERROR] ${label}`, err);
      throw err;
    } finally {
      endSync(label);
    }
  }
    