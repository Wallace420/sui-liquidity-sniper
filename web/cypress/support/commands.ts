// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Deklariere den Namespace für TypeScript
declare namespace Cypress {
  interface Chainable {
    /**
     * Benutzerdefinierter Befehl zum Anmelden in der Anwendung
     * @example cy.login('username', 'password')
     */
    login(username: string, password: string): Chainable<Element>;

    /**
     * Benutzerdefinierter Befehl zum Verbinden einer Wallet
     * @example cy.connectWallet()
     */
    connectWallet(): Chainable<Element>;

    /**
     * Benutzerdefinierter Befehl zum Warten auf WebSocket-Verbindung
     * @example cy.waitForWebSocket()
     */
    waitForWebSocket(): Chainable<Element>;

    /**
     * Benutzerdefinierter Befehl zum Warten auf das Laden von Daten
     * @example cy.waitForData('pools-table')
     */
    waitForData(dataTestId: string, timeout?: number): Chainable<Element>;
  }
}

// Befehl zum Anmelden
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.get('[data-testid="dashboard"]').should('be.visible');
});

// Befehl zum Verbinden einer Wallet
Cypress.Commands.add('connectWallet', () => {
  cy.get('[data-testid="connect-wallet-button"]').click();
  
  // Simuliere die Wallet-Verbindung (dies hängt von der Implementierung ab)
  // In einer echten Anwendung würde hier ein Mock für die Wallet-Verbindung verwendet
  cy.window().then((win) => {
    // Simuliere eine erfolgreiche Wallet-Verbindung
    win.postMessage({ type: 'wallet-connected', address: '0x123...abc' }, '*');
  });
  
  // Warte auf die Bestätigung der Verbindung
  cy.get('[data-testid="wallet-connected"]').should('be.visible');
});

// Befehl zum Warten auf WebSocket-Verbindung
Cypress.Commands.add('waitForWebSocket', () => {
  cy.get('[data-testid="connection-status"]', { timeout: 10000 })
    .should('contain', 'Connected');
});

// Befehl zum Warten auf das Laden von Daten
Cypress.Commands.add('waitForData', (dataTestId: string, timeout = 15000) => {
  cy.get(`[data-testid="${dataTestId}"]`, { timeout }).should('be.visible');
}); 