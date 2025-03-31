import { ParsedPoolData, PoolStatus, TradeMetrics } from '../types/index.js';
/**
 * Zeigt einen formatierten Header für die Anwendung an
 */
export declare function displayHeader(): void;
/**
 * Zeigt eine Tabelle mit aktiven Pools an
 * @param pools Liste der aktiven Pools
 */
export declare function displayActivePoolsTable(pools: PoolStatus[]): void;
/**
 * Zeigt detaillierte Informationen zu einem Pool an
 * @param pool Pool-Daten
 * @param status Pool-Status (optional)
 */
export declare function displayPoolDetails(pool: ParsedPoolData, status?: PoolStatus): void;
/**
 * Zeigt eine Zusammenfassung der Sniping-Ergebnisse an
 * @param metrics Handelsmetriken
 */
export declare function displaySnipingSummary(metrics: TradeMetrics): void;
/**
 * Zeigt eine Benachrichtigung über einen neuen Pool an
 * @param pool Pool-Daten
 * @param riskScore Risiko-Score
 * @param isHoneypot Ist der Pool ein Honeypot?
 */
export declare function displayNewPoolAlert(pool: ParsedPoolData, riskScore: number, isHoneypot: boolean): void;
/**
 * Startet eine Ladeanimation
 * @param text Text, der während des Ladens angezeigt wird
 */
export declare function startSpinner(text: string): void;
/**
 * Stoppt die Ladeanimation
 * @param text Abschlusstext (optional)
 * @param type Typ der Nachricht (success, error, info, warn)
 */
export declare function stopSpinner(text?: string, type?: 'success' | 'error' | 'info' | 'warn'): void;
/**
 * Zeigt eine Fehlermeldung an
 * @param message Fehlermeldung
 */
export declare function displayError(message: string): void;
/**
 * Zeigt eine Erfolgsmeldung an
 * @param message Erfolgsmeldung
 */
export declare function displaySuccess(message: string): void;
/**
 * Initialisiert die Benutzereingabe
 * @param onCommand Callback-Funktion für Befehle
 */
export declare function initializeUserInput(onCommand: (command: string) => void): void;
/**
 * Zeigt eine Hilfeübersicht an
 */
export declare function displayHelp(): void;
