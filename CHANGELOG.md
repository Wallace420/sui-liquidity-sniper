<<<<<<< HEAD
# Changelog: SUI Liquidity Sniper

Alle wichtigen Änderungen am Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Hinzugefügt
- End-to-End-Tests für Frontend-Workflows mit Cypress
  - Tests für Dashboard-Seite
  - Tests für Einstellungsseite
  - Tests für Trading-Workflows
  - Benutzerdefinierte Cypress-Befehle für häufige Aktionen
  - Dokumentation für E2E-Tests in `web/E2E-TESTS.md`
- Unit-Tests für Fehlerbehandlung im Backend
  - Tests für Fehlerkontext und -schweregrad
  - Tests für Retry-Mechanismen mit exponentiellen Backoff
  - Tests für Fehlerberichterstattung
  - Tests für HTTP-Anfragen mit Wiederholungsversuchen
- Umfassende Integrationstests für die API-Endpunkte
  - Dokumentation für Integrationstests in `src/__tests__/integration/README.md`
  - Hilfsfunktionen und Mock-Daten in `src/__tests__/integration/test-helpers.ts`
  - Integrationstests für die Pools-API
  - Integrationstests für die Trading-API
  - Integrationstests für die WebSocket-API
- E2E-Tests für die Frontend-Komponenten
  - Tests für die Dashboard-Seite
  - Tests für die Einstellungsseite
  - Tests für den Trading-Workflow

### Geändert
- Verbesserte Typisierung in der Fehlerbehandlung
- Optimierte WebSocket-Verbindungslogik für bessere Stabilität
- Verbesserte Fehlerbehandlung in API-Endpunkten
- Optimierte WebSocket-Verbindung für bessere Stabilität

### Behoben
- Linter-Fehler in Test-Dateien durch Anpassung der Typdefinitionen
- Fehler bei der Anzeige von Preisänderungen im Dashboard
- Problem mit der Wallet-Verbindung bei bestimmten Netzwerkbedingungen

## [0.5.0] - 2025-02-28

### Hinzugefügt
- Unit-Tests für kritische Backend-Komponenten
- Jest-Konfiguration für das Backend
- Test-Setup mit Mocks und Konfigurationen
- Testabdeckungsberichte

### Geändert
- Verbesserte Fehlerbehandlung in WebSocket-Verbindungen
- Optimierte WebSocket-Datenübertragung

### Behoben
- Speicherlecks in langlebigen WebSocket-Verbindungen
- Fehler bei der Wiederverbindung nach Verbindungsabbrüchen

## [0.4.0] - 2025-02-15

### Hinzugefügt
- Daten-Caching für häufig abgefragte Informationen
- Retry-Mechanismen für fehlgeschlagene API-Anfragen
- Erweiterte Logging-Funktionalität

### Geändert
- Reduzierte Bundle-Größe des Frontends
- Verbesserte Ladezeiten durch Code-Splitting

### Behoben
- Fehler bei der Verarbeitung großer Datenmengen
- Inkonsistenzen in der Benutzeroberfläche bei langsamen Verbindungen

## [0.3.0] - 2025-02-26

### Hinzugefügt
- Implementierung von Code-Splitting und Lazy-Loading im Frontend
- Optimierung der Bildressourcen und Assets
- Erstellung von Komponenten für Ladezustände
- Verbesserung der Fehlerbehandlung in WebSocket-Verbindungen
- Implementierung von Retry-Mechanismen für fehlgeschlagene API-Anfragen
- Erweiterung der Logging-Funktionalität für bessere Diagnose

### Geändert
- Reduzierung der Bundle-Größe des Frontends
- Optimierung der WebSocket-Datenübertragung (Komprimierung, Batching)

## [0.2.0] - 2025-02-15

### Hinzugefügt
- Implementierung von Daten-Caching für häufig abgefragte Informationen
- Aktualisierung der README-Dateien im Haupt- und Frontend-Verzeichnis
- Dokumentation des Backup-Systems
- Aktualisierung der Entwicklungsdokumentation
- WebSocket-Integration für Echtzeit-Preisaktualisierungen
- Unterstützung für mehrere Wallets
- Erweiterte Analysetools für Liquiditätspools
- Verbesserte Benutzeroberfläche mit Dark Mode

### Geändert
- Zusammenführung von Backend- und Frontend-Umgebungsvariablen in einer zentralen `.env`-Datei
- Entfernung der redundanten `.env.example`-Datei im Frontend-Verzeichnis
- Dokumentation aller Umgebungsvariablen mit Beschreibungen
- Überarbeitete Architektur für bessere Skalierbarkeit
- Optimierte API-Anfragen für schnellere Ladezeiten

### Behoben
- Fehler bei der Berechnung des Slippage
- Probleme mit der Anzeige auf mobilen Geräten

## [0.1.0] - 2025-02-01

### Hinzugefügt
- Initiale Version des SUI Liquidity Sniper
- Zusammenführung der Socket.io- und nativen WebSocket-Implementierungen
- Erstellung eines einheitlichen React-Hooks für WebSocket-Verbindungen
- Entfernung der veralteten `socket.ts`-Datei
- Erste Version des SUI Liquidity Snipers
- Grundlegende Funktionen zum Auffinden und Analysieren von Liquiditätspools
- Einfache Swap-Funktionalität
- Wallet-Integration für SUI-Blockchain

## [2.1.0] 
=======
# Changelog

## [2.1.0] - 2023-10-20
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca

### Hinzugefügt
- Schnellzugriffsbefehle für alle wichtigen Funktionen (h, c, s, p, a, x, r, f, qb, qs, w, q)
- Neue Befehle für schnellen Zugriff auf wichtige Funktionen:
  - `risk` (r) - Zeigt Risikoanalyse für alle Pools
  - `filter` (f) - Zeigt und ändert Filtereinstellungen
  - `quickbuy` (qb) - Kauft automatisch den besten Pool
  - `quicksell` (qs) - Verkauft alle gekauften Token
  - `wallet` (w) - Zeigt Wallet-Informationen
  - `scan` - Scannt aktiv nach neuen Pools
  - `monitor <on|off>` - Schaltet Pool-Überwachung ein/aus
- Verbesserte Risikoanalyse mit farblicher Hervorhebung
- Schnellfiltereinstellungen für einfache Konfiguration

### Geändert
- Optimierte Benutzeroberfläche für schnelleren Zugriff auf wichtige Funktionen
- Verbesserte Hilfeübersicht mit Anzeige der Schnellbefehle
- Strukturierte Darstellung der Wallet-Informationen

<<<<<<< HEAD
## [2.0.0] 
=======
## [2.0.0] - 2023-10-15
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca

### Hinzugefügt
- Neue CLI-Benutzeroberfläche mit verbesserter Terminal-Ausgabe
- Strukturierte Anzeige aller wichtigen Informationen in Tabellen und Boxen
- Farbkodierung für wichtige Informationen
- Detaillierte Pool-Informationen mit Social-Media-Links und Metriken
- Echtzeit-Benachrichtigungen für neue Pools
- Benutzerfreundliche Eingabeaufforderung mit Befehlshistorie
- Neue Befehle für die Verwaltung von Pools und Konfigurationen
- Verbesserte Fehlerbehandlung und Benutzerführung

### Geändert
- Vollständige Überarbeitung der Terminal-Ausgabe
- Verbesserte Filterung von Pools basierend auf Risiko-Score, Liquidität und Honeypot-Erkennung
- Optimierte Darstellung von Pool-Informationen
- Verbesserte Benutzerführung durch klare Fehlermeldungen und Hilfestellungen

### Behoben
- Probleme mit der Anzeige von langen Token-Adressen
- Fehler bei der Darstellung von Risiko-Scores
- Probleme mit der Benutzerinteraktion während laufender Prozesse

<<<<<<< HEAD
## [1.5.0] - 2025-02-28

### Hinzugefügt
- Unit-Tests für kritische Backend-Komponenten
- Jest-Konfiguration für automatisierte Tests
- Test-Setup mit Mocks für WebSocket und Fetch
- Test-Umgebungsvariablen für isolierte Tests

### Verbessert
- Testabdeckung für WebSocket-Implementierung
- Testabdeckung für Cache-System
- Testabdeckung für Fehlerbehandlung
- Dokumentation der Testfälle

### Technische Verbesserungen
- Automatisierte Tests für Fehlerszenarien
- Mocks für externe Abhängigkeiten
- Deterministische Tests mit kontrollierten Zeitstempeln
- Isolierte Testumgebung mit eigenen Konfigurationen

## [1.4.0] - 2025-02-27

### Hinzugefügt
- Bundle-Optimierungen mit Code-Splitting und Lazy-Loading
- Lazy-Loading-Utilities für dynamisches Laden von Komponenten
- Bildoptimierungen für schnellere Ladezeiten
- Komponenten für verschiedene Ladezustände (Spinner, Skeleton, etc.)

### Verbessert
- Next.js-Konfiguration für optimierte Produktions-Builds
- Webpack-Optimierungen für kleinere Bundle-Größen
- Responsive Bildgrößen für verschiedene Bildschirmgrößen
- Fehlerbehandlung in Ladezuständen

### Technische Verbesserungen
- SWC-Minifier für schnellere Builds
- Optimierte Chunk-Aufteilung für besseres Caching
- Automatisches Lazy-Loading von Komponenten mit Suspense
- Intersection Observer für verzögertes Laden von Bildern

## [1.3.0] - 2025-02-26

### Hinzugefügt
- Cache-System für häufig abgefragte Daten implementiert
- WebSocket-Optimierung mit Komprimierung und Batching
- Erweiterte Fehlerbehandlung mit Retry-Mechanismen
- Globale Fehlerhandler für unbehandelte Fehler

### Verbessert
- WebSocket-Verbindungen robuster mit Timeout-Handling und Reconnect-Logik
- API-Anfragen mit automatischen Wiederholungsversuchen
- Datenübertragung durch Komprimierung und Batching optimiert
- Fehlerberichterstattung mit Kontext und Schweregrad

### Technische Verbesserungen
- LRU-Cache-Implementierung für verschiedene Datentypen
- Exponentieller Backoff für Reconnect-Versuche
- Einheitliche Fehlerbehandlung in der gesamten Anwendung
- Automatische Cache-Bereinigung für Speicheroptimierung

## [1.2.0] - 2025-02-25

### Verbessert
- WebSocket-Implementierung konsolidiert: Socket.io und native WebSockets in einer einheitlichen API zusammengeführt
- Umgebungsvariablen vereinheitlicht: Backend- und Frontend-Variablen in einer zentralen `.env`-Datei zusammengeführt
- Dokumentation verbessert: README-Dateien aktualisiert und Backup-System dokumentiert

### Entfernt
- Redundante `.env.example`-Datei im Frontend-Verzeichnis entfernt
- Veraltete `socket.ts`-Datei entfernt und Funktionalität in `websocket.ts` integriert

### Technische Verbesserungen
- React-Hook für WebSocket-Verbindungen erstellt für einfachere Integration in Komponenten
- Umgebungsvariablen mit Beschreibungen dokumentiert
- Projektstruktur optimiert und redundante Dateien entfernt

## [1.0.0] - 2025-02-01

### Hinzugefügt
- Initiale Version des SUI Liquidity Sniper
- Echtzeit-Überwachung von Liquiditätspools
- Trading-Charts mit technischen Indikatoren
- Token-Analyse und Risikobewertung
- Ausführung von Transaktionen
- Visualisierung von Liquiditätspools

### Behoben
- Fehler bei der Darstellung von Risiko-Scores
- Probleme mit der Benutzerinteraktion während laufender Prozesse 
=======
## [1.0.0] - 2023-09-01

### Hinzugefügt
- Erste Version des SUI Liquidity Snipers
- Grundlegende Funktionen zum Snipen von Liquiditätspools
- Telegram-Integration für Benachrichtigungen
- Automatisches Kaufen und Verkaufen von Tokens
- Grundlegende Risikobewertung für Pools 
>>>>>>> debdeb98eebd4a8a7697c3bfdb13b7717093acca
