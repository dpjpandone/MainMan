export function safeAlert(title, message) {
    try {
      if (globalThis.Alert?.alert) {
        globalThis.Alert.alert(title, message);
      } else {
        console.warn('[SAFE ALERT FALLBACK]', title, message);
      }
    } catch (err) {
      console.warn('[SAFE ALERT ERROR]', err);
    }
  }
  