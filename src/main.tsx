import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPwa } from './lib/pwa';
import '@fontsource-variable/bricolage-grotesque';
import '@fontsource-variable/martian-mono';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

initPwa();
