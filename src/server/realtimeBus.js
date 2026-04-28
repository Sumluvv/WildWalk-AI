const listeners = new Set();

export function subscribeRealtime(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishRealtime(event) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Ignore individual listener errors to protect broadcaster.
    }
  }
}
