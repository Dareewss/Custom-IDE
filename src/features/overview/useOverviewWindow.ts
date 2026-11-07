import { useCallback, useEffect, useRef, useState } from 'react';
import { useUI } from '../../shared/ui-store';

export interface OverviewWindow {
  window: Window;
  root: HTMLElement;
}

function mirrorStyles(target: Document) {
  const copies: Node[] = [];
  const syncStyles = () => {
    copies.splice(0).forEach((node) => node.parentNode?.removeChild(node));
    for (const source of document.head.querySelectorAll('style, link[rel="stylesheet"]')) {
      const copy = source.cloneNode(true);
      target.head.appendChild(copy);
      copies.push(copy);
    }
  };
  const syncRoot = () => {
    const source = document.documentElement;
    for (const attribute of [...target.documentElement.attributes])
      if (!source.hasAttribute(attribute.name))
        target.documentElement.removeAttribute(attribute.name);
    for (const attribute of [...source.attributes])
      target.documentElement.setAttribute(attribute.name, attribute.value);
  };
  syncStyles();
  syncRoot();
  const styles = new MutationObserver(syncStyles);
  const root = new MutationObserver(syncRoot);
  styles.observe(document.head, { childList: true, subtree: true, characterData: true });
  root.observe(document.documentElement, { attributes: true });
  return () => {
    styles.disconnect();
    root.disconnect();
  };
}

export function useOverviewWindow() {
  const [target, setTarget] = useState<OverviewWindow | null>(null);
  const owned = useRef<Window | null>(null);
  const dispose = useRef<(() => void) | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dock = useCallback(() => {
    const popup = owned.current;
    if (!popup) return;
    owned.current = null;
    dispose.current?.();
    dispose.current = null;
    setTarget(null);
    useUI.setState({ layout: 'split' });
    if (!popup.closed) popup.close();
    window.codeAtlasDesktop?.focus();
    requestAnimationFrame(() => {
      const button = document.querySelector<HTMLButtonElement>('[aria-label="Pop out 3D view"]');
      (button ?? returnFocus.current)?.focus();
    });
  }, []);
  const focus = useCallback(() => {
    if (owned.current && !owned.current.closed) {
      if (owned.current.codeAtlasDesktop) owned.current.codeAtlasDesktop.focus();
      else owned.current.focus();
    }
  }, []);
  const popOut = useCallback(() => {
    if (owned.current && !owned.current.closed) {
      focus();
      return;
    }
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const popup = window.open(
      '/overview-window.html',
      'atlas-3d-overview',
      'popup,width=1000,height=760',
    );
    if (!popup) {
      useUI
        .getState()
        .reportError('The 3D window was blocked. Allow pop-ups for Code Atlas and try again.');
      return;
    }
    owned.current = popup;
    let stopStyles: (() => void) | undefined;
    const attach = () => {
      if (owned.current !== popup || popup.closed) return;
      const root = popup.document.getElementById('overview-root');
      if (!root) {
        dock();
        useUI.getState().reportError('The 3D window could not load. Please try again.');
        return;
      }
      root.replaceChildren();
      stopStyles = mirrorStyles(popup.document);
      popup.addEventListener('pagehide', dock, { once: true });
      setTarget({ window: popup, root });
      if (useUI.getState().layout === '3d') useUI.setState({ layout: 'code' });
    };
    popup.addEventListener('load', attach, { once: true });
    // The opener owns the scene and workers: never leave a disconnected viewer behind.
    const closeWithParent = () => popup.close();
    window.addEventListener('pagehide', closeWithParent);
    const timer = window.setInterval(() => {
      if (popup.closed) dock();
    }, 300);
    dispose.current = () => {
      popup.removeEventListener('load', attach);
      popup.removeEventListener('pagehide', dock);
      window.removeEventListener('pagehide', closeWithParent);
      clearInterval(timer);
      stopStyles?.();
    };
  }, [dock, focus]);
  useEffect(
    () => () => {
      dispose.current?.();
      owned.current?.close();
      owned.current = null;
    },
    [],
  );
  return { target, popOut, dock, focus };
}
