describe('Settings Page', () => {
  beforeEach(() => {
    // Besuche die Einstellungsseite vor jedem Test
    cy.visit('/settings');
    
    // Warte auf das Laden der Seite
    cy.get('body').should('be.visible');
  });

  it('sollte den Titel der Einstellungsseite anzeigen', () => {
    cy.get('h1').should('contain', 'Settings');
  });

  it('sollte die Verbindungseinstellungen anzeigen', () => {
    cy.get('[data-testid="connection-settings"]').should('be.visible');
  });

  it('sollte die API-Schlüssel-Einstellungen anzeigen', () => {
    cy.get('[data-testid="api-key-settings"]').should('be.visible');
  });

  it('sollte die Benachrichtigungseinstellungen anzeigen', () => {
    cy.get('[data-testid="notification-settings"]').should('be.visible');
  });

  it('sollte die Themeneinstellungen anzeigen und das Thema ändern', () => {
    // Prüfe, ob die Themeneinstellungen angezeigt werden
    cy.get('[data-testid="theme-settings"]').should('be.visible');
    
    // Prüfe, ob der Themen-Umschalter vorhanden ist
    cy.get('[data-testid="theme-toggle"]').should('be.visible');
    
    // Klicke auf den Themen-Umschalter
    cy.get('[data-testid="theme-toggle"]').click();
    
    // Prüfe, ob das Thema geändert wurde (dies hängt von der Implementierung ab)
    // Wenn das Standard-Thema hell ist, sollte es nach dem Klick dunkel sein
    cy.get('html').should('have.class', 'dark');
    
    // Klicke erneut, um zum ursprünglichen Thema zurückzukehren
    cy.get('[data-testid="theme-toggle"]').click();
    
    // Prüfe, ob das Thema zurückgesetzt wurde
    cy.get('html').should('not.have.class', 'dark');
  });

  it('sollte Einstellungen speichern können', () => {
    // Ändere eine Einstellung (z.B. API-Endpunkt)
    cy.get('[data-testid="api-endpoint-input"]').clear().type('https://test-api.example.com');
    
    // Klicke auf den Speichern-Button
    cy.get('[data-testid="save-settings-button"]').click();
    
    // Prüfe, ob eine Erfolgsmeldung angezeigt wird
    cy.get('[data-testid="settings-saved-message"]').should('be.visible');
    
    // Lade die Seite neu, um zu prüfen, ob die Einstellungen gespeichert wurden
    cy.reload();
    
    // Prüfe, ob die geänderte Einstellung beibehalten wurde
    cy.get('[data-testid="api-endpoint-input"]').should('have.value', 'https://test-api.example.com');
  });

  it('sollte die Einstellungen zurücksetzen können', () => {
    // Klicke auf den Zurücksetzen-Button
    cy.get('[data-testid="reset-settings-button"]').click();
    
    // Bestätige den Dialog
    cy.get('[data-testid="confirm-reset-button"]').click();
    
    // Prüfe, ob eine Erfolgsmeldung angezeigt wird
    cy.get('[data-testid="settings-reset-message"]').should('be.visible');
    
    // Prüfe, ob die Einstellungen auf die Standardwerte zurückgesetzt wurden
    cy.get('[data-testid="api-endpoint-input"]').should('have.value', 'https://api.sui.io');
  });
}); 