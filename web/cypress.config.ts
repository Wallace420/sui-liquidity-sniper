import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    setupNodeEvents(on, config) {
      // Hier können Event-Listener für Cypress-Ereignisse implementiert werden
    },
  },
  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack',
    },
  },
}); 