// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Unterdrücke unkritische Fehler im Zusammenhang mit ResizeObserver
const resizeObserverLoopErrRe = /^[^(ResizeObserver loop limit exceeded)]/;
Cypress.on('uncaught:exception', (err) => {
  if (resizeObserverLoopErrRe.test(err.message)) {
    return false;
  }
  return true;
});

// Unterdrücke WebSocket-Fehler während der Tests
Cypress.on('uncaught:exception', (err) => {
  if (err.message.includes('WebSocket')) {
    return false;
  }
  return true;
}); 