// utils/InAppLogger.js
const inAppLogs = [];
let logCallback = null;

export function addInAppLog(msg) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  inAppLogs.push(`[${timestamp}] ${msg}`);
  if (inAppLogs.length > 50) inAppLogs.shift();
  if (logCallback) logCallback([...inAppLogs]);
}

export function registerLogListener(cb) {
  logCallback = cb;
}

export function unregisterLogListener() {
  logCallback = null;
}
export function clearInAppLogs() {
    if (logCallback) logCallback([]); // clear display
    inAppLogs.length = 0; // clear history
  }
  