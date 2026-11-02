import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';
import './workspace.css';
import './features/appearance/background.css';
import './features/appearance/tokens.css';
import './features/appearance/glass.css';
import './features/appearance/shell.css';
import './features/appearance/editor.css';
import './features/appearance/presets.css';
import { ErrorBoundary } from './shared/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
