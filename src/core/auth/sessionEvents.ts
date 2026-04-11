type SessionInvalidHandler = () => void;

const handlers = new Set<SessionInvalidHandler>();

export function onSessionInvalidated(handler: SessionInvalidHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitSessionInvalidated(): void {
  for (const handler of handlers) {
    try {
      handler();
    } catch {
      // Ignore listener failures so one bad subscriber does not block logout.
    }
  }
}
