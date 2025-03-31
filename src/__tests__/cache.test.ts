/**
 * Unit-Tests für das Cache-System
 */

import { jest } from '@jest/globals';
import { Cache } from '../utils/cache.js';

describe('Cache', () => {
  let cache: Cache<any>;
  
  beforeEach(() => {
    // Cache mit Standardoptionen erstellen
    cache = new Cache();
    
    // Date.now mocken, um deterministische Tests zu ermöglichen
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });
  
  afterEach(() => {
    // Mocks zurücksetzen
    jest.restoreAllMocks();
  });
  
  test('sollte Werte speichern und abrufen können', () => {
    // Wert speichern
    cache.set('key1', 'value1');
    
    // Wert abrufen
    const value = cache.get('key1');
    
    // Prüfen, ob der Wert korrekt abgerufen wurde
    expect(value).toBe('value1');
  });
  
  test('sollte null zurückgeben, wenn der Schlüssel nicht existiert', () => {
    // Nicht existierenden Schlüssel abrufen
    const value = cache.get('nonexistent');
    
    // Prüfen, ob null zurückgegeben wurde
    expect(value).toBeNull();
  });
  
  test('sollte prüfen können, ob ein Schlüssel existiert', () => {
    // Wert speichern
    cache.set('key1', 'value1');
    
    // Prüfen, ob der Schlüssel existiert
    const exists = cache.has('key1');
    const nonExists = cache.has('nonexistent');
    
    // Prüfen, ob die Ergebnisse korrekt sind
    expect(exists).toBe(true);
    expect(nonExists).toBe(false);
  });
  
  test('sollte Einträge löschen können', () => {
    // Wert speichern
    cache.set('key1', 'value1');
    
    // Eintrag löschen
    const deleted = cache.delete('key1');
    
    // Prüfen, ob der Eintrag gelöscht wurde
    expect(deleted).toBe(true);
    expect(cache.has('key1')).toBe(false);
  });
  
  test('sollte den Cache leeren können', () => {
    // Werte speichern
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    // Cache leeren
    cache.clear();
    
    // Prüfen, ob der Cache leer ist
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
    expect(cache.size).toBe(0);
  });
  
  test('sollte abgelaufene Einträge automatisch entfernen', () => {
    // Wert mit TTL von 500ms speichern
    cache.set('key1', 'value1', 500);
    
    // Zeit voranschreiten lassen
    jest.spyOn(Date, 'now').mockImplementation(() => 2000);
    
    // Wert abrufen
    const value = cache.get('key1');
    
    // Prüfen, ob der Wert null ist (abgelaufen)
    expect(value).toBeNull();
    expect(cache.has('key1')).toBe(false);
  });
  
  test('sollte den ältesten Eintrag entfernen, wenn der Cache voll ist', () => {
    // Cache mit maxSize 2 erstellen
    const smallCache = new Cache({ maxSize: 2 });
    
    // Werte speichern
    smallCache.set('key1', 'value1');
    
    // Zeit voranschreiten lassen für unterschiedliche Zeitstempel
    jest.spyOn(Date, 'now').mockImplementation(() => 1100);
    smallCache.set('key2', 'value2');
    
    // Zeit weiter voranschreiten lassen
    jest.spyOn(Date, 'now').mockImplementation(() => 1200);
    
    // Dritten Wert speichern, sollte key1 verdrängen
    smallCache.set('key3', 'value3');
    
    // Prüfen, ob key1 entfernt wurde
    expect(smallCache.has('key1')).toBe(false);
    expect(smallCache.has('key2')).toBe(true);
    expect(smallCache.has('key3')).toBe(true);
    expect(smallCache.size).toBe(2);
  });
  
  test('sollte abgelaufene Einträge bei cleanup entfernen', () => {
    // Werte mit unterschiedlichen TTLs speichern
    cache.set('key1', 'value1', 500); // Läuft nach 1500ms ab
    cache.set('key2', 'value2', 2000); // Läuft nach 3000ms ab
    
    // Zeit voranschreiten lassen, sodass key1 abläuft
    jest.spyOn(Date, 'now').mockImplementation(() => 2000);
    
    // Cleanup durchführen
    cache.cleanup();
    
    // Prüfen, ob key1 entfernt wurde und key2 noch existiert
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
  });
  
  test('sollte den Zeitstempel aktualisieren, wenn ein Wert abgerufen wird (LRU)', () => {
    // Cache mit maxSize 2 erstellen
    const lruCache = new Cache({ maxSize: 2 });
    
    // Werte speichern
    lruCache.set('key1', 'value1');
    
    // Zeit voranschreiten lassen für unterschiedliche Zeitstempel
    jest.spyOn(Date, 'now').mockImplementation(() => 1100);
    lruCache.set('key2', 'value2');
    
    // Zeit weiter voranschreiten lassen
    jest.spyOn(Date, 'now').mockImplementation(() => 1200);
    
    // key1 abrufen, um den Zeitstempel zu aktualisieren
    lruCache.get('key1');
    
    // Zeit weiter voranschreiten lassen
    jest.spyOn(Date, 'now').mockImplementation(() => 1300);
    
    // Dritten Wert speichern, sollte key2 verdrängen (da key1 zuletzt verwendet wurde)
    lruCache.set('key3', 'value3');
    
    // Prüfen, ob key2 entfernt wurde
    expect(lruCache.has('key1')).toBe(true);
    expect(lruCache.has('key2')).toBe(false);
    expect(lruCache.has('key3')).toBe(true);
  });
  
  test('sollte mit benutzerdefinierten TTL-Werten umgehen können', () => {
    // Cache mit Standard-TTL von 1000ms erstellen
    const ttlCache = new Cache({ ttl: 1000 });
    
    // Wert mit Standard-TTL speichern
    ttlCache.set('key1', 'value1');
    
    // Wert mit benutzerdefiniertem TTL speichern
    ttlCache.set('key2', 'value2', 2000);
    
    // Zeit voranschreiten lassen, sodass key1 abläuft
    jest.spyOn(Date, 'now').mockImplementation(() => 2500);
    
    // Prüfen, ob key1 abgelaufen ist und key2 noch existiert
    expect(ttlCache.has('key1')).toBe(false);
    expect(ttlCache.has('key2')).toBe(true);
  });
}); 