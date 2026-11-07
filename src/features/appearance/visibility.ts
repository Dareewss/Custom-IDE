import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useHostWindow } from '../../shared/HostWindow';

export function usePageVisible() {
  const host = useHostWindow();
  const subscribe = useCallback(
    (notify: () => void) => {
      host.document.addEventListener('visibilitychange', notify);
      return () => host.document.removeEventListener('visibilitychange', notify);
    },
    [host],
  );
  const visible = useSyncExternalStore(
    subscribe,
    () => host.document.visibilityState !== 'hidden',
    () => true,
  );
  const [nativeVisible, setNativeVisible] = useState(true);
  useEffect(() => host.codeAtlasDesktop?.onVisibilityChanged?.(setNativeVisible), [host]);
  return visible && nativeVisible;
}
