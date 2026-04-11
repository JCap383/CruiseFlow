/// <reference types="vite/client" />

// Build-time constants injected via Vite `define` (see vite.config.ts).
// Surfaced on the Settings page so users can identify which build of
// the app they're running.
declare const __APP_VERSION__: string;
declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;
