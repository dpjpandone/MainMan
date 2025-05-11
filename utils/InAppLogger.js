import { supabase } from './supaBaseConfig';

const LOGGING_ENABLED = false; // ⬅️ Set to false for field testing

const inAppLogs = [];
let logCallback = null;

export function addInAppLog(msg) {
  if (!LOGGING_ENABLED) return;

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

export async function pushLogsToSupabase(logs, tag = 'manual', deviceId = 'dev') {
  if (!LOGGING_ENABLED) return;

  const text = logs.join('\n');

  const { error } = await supabase.from('debug_logs').insert([{
    log_text: text,
    tag,
    device_id: deviceId,
  }]);

  if (error) {
    console.warn('[LOG UPLOAD FAIL]', error.message);
  } else {
    console.log('[LOG UPLOADED] Logs pushed to Supabase');
  }
}
