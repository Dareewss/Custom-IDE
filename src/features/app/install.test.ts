import { afterEach, expect, it, vi } from 'vitest';
import { persistCurrent } from '../projects/persistence';
import { installApp, applyAppUpdate, useAppState, type InstallPromptEvent } from './install';
vi.mock('../projects/persistence', () => ({ persistCurrent: vi.fn() }));
afterEach(() => {
  useAppState.setState({ prompt: null, installed: false, dialog: false, registration: null });
  vi.clearAllMocks();
});

it.each(['accepted', 'dismissed'] as const)(
  'handles a real prompt outcome: %s',
  async (outcome) => {
    const event = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome, platform: 'web' }),
    }) as InstallPromptEvent;
    useAppState.setState({ prompt: event });
    await installApp();
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(useAppState.getState().installed).toBe(outcome === 'accepted');
    expect(useAppState.getState().prompt).toBeNull();
  },
);
it('opens actionable instructions when the native prompt is unavailable', async () => {
  await installApp();
  expect(useAppState.getState().dialog).toBe(true);
});
it('never activates an update if saving fails', async () => {
  vi.mocked(persistCurrent).mockRejectedValueOnce(new Error('Storage full'));
  const postMessage = vi.fn();
  useAppState.setState({
    registration: { waiting: { postMessage } } as unknown as ServiceWorkerRegistration,
  });
  await expect(applyAppUpdate()).rejects.toThrow('Storage full');
  expect(postMessage).not.toHaveBeenCalled();
});
