describe('Dashboard Page', () => {
  beforeEach(() => {
    // Besuche die Dashboard-Seite vor jedem Test
    cy.visit('/');
    
    // Warte auf das Laden der Seite
    cy.get('body').should('be.visible');
  });

  it('sollte den Titel der Anwendung anzeigen', () => {
    cy.get('h1').should('contain', 'SUI Liquidity Sniper');
  });

  it('sollte die Hauptnavigation anzeigen', () => {
    cy.get('nav').should('be.visible');
  });

  it('sollte die Verbindung zum WebSocket-Server herstellen', () => {
    // Prüfe, ob der Verbindungsstatus angezeigt wird
    cy.get('[data-testid="connection-status"]').should('exist');
    
    // Warte auf erfolgreiche Verbindung (kann je nach Implementierung variieren)
    cy.get('[data-testid="connection-status"]', { timeout: 10000 })
      .should('contain', 'Connected');
  });

  it('sollte die Liquiditätspools anzeigen', () => {
    // Warte auf das Laden der Pools
    cy.get('[data-testid="pools-table"]', { timeout: 15000 }).should('be.visible');
    
    // Prüfe, ob mindestens ein Pool angezeigt wird
    cy.get('[data-testid="pool-row"]').should('have.length.at.least', 1);
  });

  it('sollte die Filterfunktion für Pools unterstützen', () => {
    // Warte auf das Laden der Pools
    cy.get('[data-testid="pools-table"]', { timeout: 15000 }).should('be.visible');
    
    // Gib einen Suchbegriff in das Filterfeld ein
    cy.get('[data-testid="pool-filter"]').type('SUI');
    
    // Prüfe, ob die Ergebnisse gefiltert wurden
    cy.get('[data-testid="pool-row"]').each(($row) => {
      cy.wrap($row).should('contain', 'SUI');
    });
  });

  it('sollte die Detailansicht eines Pools öffnen', () => {
    // Warte auf das Laden der Pools
    cy.get('[data-testid="pools-table"]', { timeout: 15000 }).should('be.visible');
    
    // Klicke auf den ersten Pool
    cy.get('[data-testid="pool-row"]').first().click();
    
    // Prüfe, ob die Detailansicht geöffnet wurde
    cy.get('[data-testid="pool-details"]').should('be.visible');
    
    // Prüfe, ob der Pool-Name in der Detailansicht angezeigt wird
    cy.get('[data-testid="pool-name"]').should('be.visible');
  });
}); 