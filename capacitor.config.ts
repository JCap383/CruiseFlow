import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cruiseflow.app',
  appName: 'CruiseFlow',
  webDir: 'dist',
  server: {
    // In dev, use the Vite dev server for HMR
    ...(process.env.NODE_ENV === 'development'
      ? { url: 'http://localhost:5173', cleartext: true }
      : {}),
  },
  ios: {
    scheme: 'CruiseFlow',
    contentInset: 'automatic',
  },
};

export default config;
