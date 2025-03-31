describe('Trading Workflow', () => {
  beforeEach(() => {
    // Besuche die Trading-Seite vor jedem Test
    cy.visit('/trading');
    
    // Warte auf das Laden der Seite
    cy.get('body').should('be.visible');
  });

  it('sollte den Titel der Trading-Seite anzeigen', () => {
    cy.get('h1').should('contain', 'Trading');
  });

  it('sollte das Wallet-Guthaben anzeigen', () => {
    cy.get('[data-testid="wallet-balance"]').should('be.visible');
  });

  it('sollte die Token-Auswahl anzeigen', () => {
    cy.get('[data-testid="token-selector"]').should('be.visible');
  });

  it('sollte einen Token auswählen können', () => {
    // Öffne die Token-Auswahl
    cy.get('[data-testid="token-selector"]').click();
    
    // Wähle den ersten Token aus der Liste
    cy.get('[data-testid="token-option"]').first().click();
    
    // Prüfe, ob der ausgewählte Token angezeigt wird
    cy.get('[data-testid="selected-token"]').should('be.visible');
  });

  it('sollte den Betrag eingeben können', () => {
    // Gib einen Betrag ein
    cy.get('[data-testid="amount-input"]').clear().type('1.5');
    
    // Prüfe, ob der Betrag korrekt angezeigt wird
    cy.get('[data-testid="amount-input"]').should('have.value', '1.5');
  });

  it('sollte die Preisvorschau anzeigen', () => {
    // Wähle einen Token aus
    cy.get('[data-testid="token-selector"]').click();
    cy.get('[data-testid="token-option"]').first().click();
    
    // Gib einen Betrag ein
    cy.get('[data-testid="amount-input"]').clear().type('1.5');
    
    // Prüfe, ob die Preisvorschau angezeigt wird
    cy.get('[data-testid="price-preview"]').should('be.visible');
  });

  it('sollte die Slippage einstellen können', () => {
    // Öffne die Slippage-Einstellungen
    cy.get('[data-testid="slippage-settings"]').click();
    
    // Wähle eine vordefinierte Slippage
    cy.get('[data-testid="slippage-option"]').contains('1%').click();
    
    // Prüfe, ob die ausgewählte Slippage angezeigt wird
    cy.get('[data-testid="selected-slippage"]').should('contain', '1%');
    
    // Oder gib eine benutzerdefinierte Slippage ein
    cy.get('[data-testid="custom-slippage-input"]').clear().type('0.5');
    
    // Prüfe, ob die benutzerdefinierte Slippage angezeigt wird
    cy.get('[data-testid="selected-slippage"]').should('contain', '0.5%');
  });

  it('sollte eine Transaktion simulieren können', () => {
    // Wähle einen Token aus
    cy.get('[data-testid="token-selector"]').click();
    cy.get('[data-testid="token-option"]').first().click();
    
    // Gib einen Betrag ein
    cy.get('[data-testid="amount-input"]').clear().type('1.5');
    
    // Klicke auf den Simulieren-Button
    cy.get('[data-testid="simulate-button"]').click();
    
    // Warte auf das Ergebnis der Simulation
    cy.get('[data-testid="simulation-result"]', { timeout: 10000 }).should('be.visible');
    
    // Prüfe, ob die Gasgebühren angezeigt werden
    cy.get('[data-testid="gas-fees"]').should('be.visible');
  });

  it('sollte eine Transaktion bestätigen können', () => {
    // Wähle einen Token aus
    cy.get('[data-testid="token-selector"]').click();
    cy.get('[data-testid="token-option"]').first().click();
    
    // Gib einen Betrag ein
    cy.get('[data-testid="amount-input"]').clear().type('1.5');
    
    // Klicke auf den Kaufen-Button
    cy.get('[data-testid="buy-button"]').click();
    
    // Prüfe, ob der Bestätigungsdialog angezeigt wird
    cy.get('[data-testid="confirmation-dialog"]').should('be.visible');
    
    // Bestätige die Transaktion
    cy.get('[data-testid="confirm-transaction-button"]').click();
    
    // Warte auf die Bestätigung der Transaktion
    cy.get('[data-testid="transaction-success"]', { timeout: 15000 }).should('be.visible');
  });

  it('sollte die Transaktionshistorie anzeigen', () => {
    // Navigiere zur Transaktionshistorie
    cy.get('[data-testid="transaction-history-tab"]').click();
    
    // Prüfe, ob die Transaktionshistorie angezeigt wird
    cy.get('[data-testid="transaction-history"]').should('be.visible');
    
    // Prüfe, ob mindestens eine Transaktion angezeigt wird
    cy.get('[data-testid="transaction-item"]').should('have.length.at.least', 1);
  });
}); 