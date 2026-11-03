import { useEffect, useState, useSyncExternalStore } from 'react';

const subscribe = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
export function usePageVisible() {
  const visible = useSyncExternalStore(
    subscribe,
    () => document.visibilityState !== 'hidden',
    () => true,
  );
  const [nativeVisible, setNativeVisible] = useState(true);
  useEffect(() => window.codeAtlasDesktop?.onVisibilityChanged?.(setNativeVisible), []);
  return visible && nativeVisible;
}
