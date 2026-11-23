import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { z } from 'zod';
import './data/generated/fonts.css';
import './ui/tokens.css';
import './ui/global.css';
import { App } from './App';
import { initTrustedSwPolicy } from './app/pwa';

z.config({ jitless: true });
initTrustedSwPolicy();

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
