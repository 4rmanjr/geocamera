import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.geocampro',
  appName: 'GeoCamPro',
  webDir: 'dist',
  server: {
    allowNavigation: ['*']
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
