import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import './index.css';

/**
 * iOS standalone PWAs report inconsistent values for 100vh/100dvh/100svh
 * which can leave empty space at the bottom of the screen. Measure the
 * actual visible viewport in JS and expose it as a CSS variable used by
 * the app shell.
 */
function setAppHeight() {
  // visualViewport is the most accurate on iOS Safari (accounts for the
  // on-screen keyboard and the URL bar). Fall back to innerHeight.
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${h}px`);
}

setAppHeight();
window.addEventListener('resize', setAppHeight);
window.addEventListener('orientationchange', setAppHeight);
window.visualViewport?.addEventListener('resize', setAppHeight);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
