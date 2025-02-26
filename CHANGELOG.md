# Changelog

## [2.1.0] - 2023-10-20

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

## [2.0.0] - 2023-10-15

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

## [1.0.0] - 2023-09-01

### Hinzugefügt
- Erste Version des SUI Liquidity Snipers
- Grundlegende Funktionen zum Snipen von Liquiditätspools
- Telegram-Integration für Benachrichtigungen
- Automatisches Kaufen und Verkaufen von Tokens
- Grundlegende Risikobewertung für Pools 