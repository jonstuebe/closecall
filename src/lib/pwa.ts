import { registerSW } from 'virtual:pwa-register';

type UpdateHandler = () => void;

let handlers: UpdateHandler[] = [];
let update: ((reload?: boolean) => Promise<void>) | null = null;
let pending = false;

/** Registers the service worker and remembers when a new version is waiting. */
export function initPwa(): void {
  update = registerSW({
    immediate: true,
    onNeedRefresh() {
      pending = true;
      handlers.forEach((handler) => handler());
    },
  });
}

/** Calls back when a new version is ready, including one that arrived before subscribing. */
export function onUpdateAvailable(handler: UpdateHandler): () => void {
  handlers.push(handler);
  if (pending) handler();
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}

/** Activates the waiting service worker and reloads into the new version. */
export function applyUpdate(): void {
  void update?.(true);
}
