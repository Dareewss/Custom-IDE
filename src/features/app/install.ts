import { create } from 'zustand';
import { persistCurrent } from '../projects/persistence';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}
interface AppState {
  prompt: InstallPromptEvent | null;
  standalone: boolean;
  installed: boolean;
  online: boolean;
  offlineReady: boolean;
  updateReady: boolean;
  dialog: boolean;
  registration: ServiceWorkerRegistration | null;
  cacheError: string | null;
}
export const useAppState = create<AppState>(() => ({
  prompt: null,
  standalone: false,
  installed: false,
  online: true,
  offlineReady: false,
  updateReady: false,
  dialog: false,
  registration: null,
  cacheError: null,
}));
let registrationTask: Promise<ServiceWorkerRegistration> | null = null;
let applyingUpdate = false;

export function startAppLifecycle() {
  const display = window.matchMedia('(display-mode: standalone)');
  const syncDisplay = () =>
    useAppState.setState({
      standalone:
        display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    });
  const syncNetwork = () => useAppState.setState({ online: navigator.onLine });
  const capturePrompt = (event: Event) => {
    event.preventDefault();
    useAppState.setState({ prompt: event as InstallPromptEvent });
  };
  const installed = () => useAppState.setState({ installed: true, prompt: null });
  syncDisplay();
  syncNetwork();
  display.addEventListener('change', syncDisplay);
  window.addEventListener('online', syncNetwork);
  window.addEventListener('offline', syncNetwork);
  window.addEventListener('beforeinstallprompt', capturePrompt);
  window.addEventListener('appinstalled', installed);
  let alive = true;
  const controllerChange = () => {
    if (applyingUpdate) window.location.reload();
  };
  if ('serviceWorker' in navigator && import.meta.env.PROD && !window.codeAtlasDesktop) {
    navigator.serviceWorker.addEventListener('controllerchange', controllerChange);
    registrationTask ??= navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    void registrationTask
      .then(async (registration) => {
        await navigator.serviceWorker.ready;
        if (!alive) return;
        useAppState.setState({
          registration,
          offlineReady: true,
          updateReady: Boolean(registration.waiting),
        });
        registration.addEventListener('updatefound', () => {
          const incoming = registration.installing;
          incoming?.addEventListener('statechange', () => {
            if (incoming.state === 'installed' && navigator.serviceWorker.controller)
              useAppState.setState({ updateReady: true });
          });
        });
      })
      .catch((error: unknown) => {
        if (alive) useAppState.setState({ cacheError: String(error) });
      });
  }
  return () => {
    alive = false;
    display.removeEventListener('change', syncDisplay);
    window.removeEventListener('online', syncNetwork);
    window.removeEventListener('offline', syncNetwork);
    window.removeEventListener('beforeinstallprompt', capturePrompt);
    window.removeEventListener('appinstalled', installed);
    navigator.serviceWorker?.removeEventListener('controllerchange', controllerChange);
  };
}
export async function installApp() {
  const event = useAppState.getState().prompt;
  if (!event) {
    useAppState.setState({ dialog: true });
    return;
  }
  await event.prompt();
  const result = await event.userChoice;
  useAppState.setState({
    prompt: null,
    installed: result.outcome === 'accepted' || useAppState.getState().installed,
  });
}
export async function applyAppUpdate() {
  await persistCurrent();
  const waiting = useAppState.getState().registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  applyingUpdate = true;
  waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
}
