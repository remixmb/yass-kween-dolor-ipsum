import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the offline service worker in the production build only (it would
// interfere with Vite's dev HMR). Failures are non-fatal — the app still works.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
