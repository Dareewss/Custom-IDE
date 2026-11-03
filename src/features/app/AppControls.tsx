import { useEffect, useRef, useState } from 'react';
import { Download, Check, WifiOff, RefreshCw, X, Box, Copy } from 'lucide-react';
import { installApp, applyAppUpdate, useAppState } from './install';
import { useUI } from '../../shared/ui-store';
import { IconButton } from '../../shared/IconButton';
import './app.css';

export function AppControls() {
  const app = useAppState();
  if (window.codeAtlasDesktop)
    return (
      <span className="installed-badge">
        <Check size={13} />
        Desktop app
      </span>
    );
  return (
    <>
      <span className="app-connectivity" aria-label="Connection status">
        {!app.online && (
          <>
            <WifiOff size={13} />
            Offline
          </>
        )}
      </span>
      {app.updateReady && (
        <button
          className="app-install-button"
          onClick={() => void applyAppUpdate().catch(useUI.getState().reportError)}
        >
          <RefreshCw size={13} />
          <span>Update ready</span>
        </button>
      )}
      {app.standalone || app.installed ? (
        <span className="installed-badge">
          <Check size={13} />
          <span>{app.standalone ? 'App window' : 'Installed'}</span>
        </span>
      ) : (
        <button
          className="app-install-button"
          aria-label="Install app"
          onClick={() => useAppState.setState({ dialog: true })}
        >
          <Download size={13} />
          <span>Install app</span>
        </button>
      )}
    </>
  );
}
export function InstallDialog() {
  const app = useAppState();
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const close = () => useAppState.setState({ dialog: false });
  useEffect(() => {
    if (app.dialog) ref.current?.showModal();
    else ref.current?.close();
  }, [app.dialog]);
  return (
    <dialog
      className="glass glass--modal dialog install-dialog"
      aria-label="Install Code Atlas"
      ref={ref}
      onCancel={close}
    >
      <div className="dialog-heading">
        <h2>Make it your workspace.</h2>
        <IconButton label="Close installation guide" onClick={close}>
          <X size={16} />
        </IconButton>
      </div>
      <div className="install-app-preview">
        <img src="/icons/atlas-192.png" width="58" height="58" alt="Code Atlas icon" />
        <div>
          <strong>Code Atlas</strong>
          <span>Your code, in its own window.</span>
        </div>
        <Box size={20} />
      </div>
      <p className="install-description">
        Pin Code Atlas to your taskbar or home screen. Open it like your other apps, with your
        projects right where you left them.
      </p>
      <ol className="install-steps">
        <li>
          <span>01</span>
          <div>
            <strong>Open in Chrome or Edge</strong>
            <p>
              If you’re in a preview inside another app, copy the address below and open it in your
              browser.
            </p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Choose Install Code Atlas</strong>
            <p>
              Use the install icon in the address bar, or the browser menu → Install this page as an
              app. On iPhone or iPad, use Share → Add to Home Screen in Safari.
            </p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Launch from your apps</strong>
            <p>A dedicated window, the same local projects, and no browser tabs in the way.</p>
          </div>
        </li>
      </ol>
      <div className="install-address">
        <code>{window.location.origin}</code>
        <button
          aria-label="Copy application address"
          onClick={() => {
            void navigator.clipboard
              .writeText(window.location.origin)
              .then(() => setCopied(true))
              .catch(useUI.getState().reportError);
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <p className="install-cache-note">
        {app.offlineReady
          ? 'Workspace available offline. Python tools are cached after their first successful use.'
          : app.cacheError
            ? 'Offline caching is unavailable in this browser session. The online workspace still works.'
            : 'Offline support becomes available in the production app. Open each Python tool online once before using it offline.'}
      </p>
      <div className="dialog-actions">
        {app.prompt && (
          <button
            className="primary-button"
            onClick={() => void installApp().then(close).catch(useUI.getState().reportError)}
          >
            <Download size={13} />
            Install now
          </button>
        )}
      </div>
    </dialog>
  );
}
