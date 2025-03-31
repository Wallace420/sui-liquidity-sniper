/**
 * Cache-System für häufig abgefragte Daten
 * Implementiert LRU (Least Recently Used) Caching-Strategie
 */

interface CacheOptions {
  maxSize?: number;
  ttl?: number; // Time-to-live in Millisekunden
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiry: number;
}

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private ttl: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map<string, CacheEntry<T>>();
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '300') * 1000; // Default: 5 Minuten
  }

  /**
   * Wert im Cache speichern
   */
  set(key: string, value: T, customTtl?: number): void {
    // Wenn der Cache voll ist, entferne den ältesten Eintrag
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findOldestEntry();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    const ttl = customTtl || this.ttl;
    
    this.cache.set(key, {
      value,
      timestamp: now,
      expiry: now + ttl
    });
  }

  /**
   * Wert aus dem Cache abrufen
   */
  get<R = T>(key: string): R | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    const now = Date.now();
    
    // Prüfen, ob der Eintrag abgelaufen ist
    if (entry.expiry < now) {
      this.cache.delete(key);
      return null;
    }
    
    // Aktualisiere den Zeitstempel (LRU-Strategie)
    entry.timestamp = now;
    
    return entry.value as unknown as R;
  }

  /**
   * Prüfen, ob ein Schlüssel im Cache existiert
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Prüfen, ob der Eintrag abgelaufen ist
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Eintrag aus dem Cache entfernen
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Cache leeren
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Abgelaufene Einträge entfernen
   */
  cleanup(): void {
    const now = Date.now();
    
    // Array.from verwenden, um Kompatibilitätsprobleme zu vermeiden
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * Ältesten Eintrag finden (LRU-Strategie)
   */
  private findOldestEntry(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    
    // Array.from verwenden, um Kompatibilitätsprobleme zu vermeiden
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  /**
   * Anzahl der Einträge im Cache
   */
  get size(): number {
    return this.cache.size;
  }
}

// Globale Cache-Instanzen für verschiedene Datentypen
const poolsCache = new Cache<any[]>({ 
  maxSize: 50, 
  ttl: 60 * 1000 // 1 Minute
});

const tradesCache = new Cache<any[]>({ 
  maxSize: 100, 
  ttl: 30 * 1000 // 30 Sekunden
});

const tokenInfoCache = new Cache<any>({ 
  maxSize: 200, 
  ttl: 5 * 60 * 1000 // 5 Minuten
});

const chartDataCache = new Cache<any[]>({ 
  maxSize: 20, 
  ttl: 15 * 1000 // 15 Sekunden für Chart-Daten
});

// Cache-Instanzen exportieren
export const caches = {
  pools: poolsCache,
  trades: tradesCache,
  tokenInfo: tokenInfoCache,
  chartData: chartDataCache
};

// Hook für automatische Cache-Bereinigung
export function setupCacheCleanup(): () => void {
  // Alle 5 Minuten Cache bereinigen
  const interval = setInterval(() => {
    poolsCache.cleanup();
    tradesCache.cleanup();
    tokenInfoCache.cleanup();
    chartDataCache.cleanup();
    
    console.log('Cache bereinigt:', {
      pools: poolsCache.size,
      trades: tradesCache.size,
      tokenInfo: tokenInfoCache.size,
      chartData: chartDataCache.size
    });
  }, 5 * 60 * 1000);
  
  // Cleanup-Funktion zurückgeben
  return () => clearInterval(interval);
}

// Hilfsfunktion für das Caching von API-Anfragen
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string,
  cacheDuration?: number
): Promise<T> {
  // Cache-Schlüssel generieren
  const key = cacheKey || url;
  
  // Prüfen, ob die Daten im Cache sind
  const cachedData = tokenInfoCache.get<T>(key);
  if (cachedData) {
    return cachedData;
  }
  
  // Daten abrufen
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`Fehler beim Abrufen der Daten: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // Daten im Cache speichern
  tokenInfoCache.set(key, data, cacheDuration);
  
  return data as T;
} 