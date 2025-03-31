/**
 * Utilities für das Lazy-Loading von Komponenten
 * Verbessert die initiale Ladezeit durch dynamisches Laden von Komponenten
 */

import React, { Suspense, lazy, ComponentType } from 'react';

// Typen für die Lazy-Loading-Komponenten
interface LazyLoadOptions {
  fallback?: React.ReactNode;
  ssr?: boolean;
  preload?: boolean;
}

/**
 * Standardfallback für Lazy-Loading-Komponenten
 */
export const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-4 min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

/**
 * Erstellt eine Lazy-Loading-Komponente
 * @param importFunc - Funktion, die die Komponente importiert
 * @param options - Optionen für das Lazy-Loading
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const {
    fallback = <DefaultLoadingFallback />,
    ssr = false,
    preload = false,
  } = options;

  // Lazy-Loading-Komponente erstellen
  const LazyComponent = lazy(importFunc);

  // Preload der Komponente, wenn gewünscht
  if (preload && typeof window !== 'undefined') {
    importFunc();
  }

  // Wrapper-Komponente erstellen
  const LazyLoadComponent = (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );

  // SSR-Unterstützung hinzufügen
  if (ssr) {
    // @ts-ignore - displayName ist eine gültige Eigenschaft, aber TypeScript erkennt sie nicht immer
    LazyLoadComponent.displayName = `LazySSR(${LazyComponent.displayName || 'Component'})`;
    // @ts-ignore - Wir fügen eine dynamische Eigenschaft hinzu
    LazyLoadComponent.preload = importFunc;
  } else {
    // @ts-ignore - displayName ist eine gültige Eigenschaft, aber TypeScript erkennt sie nicht immer
    LazyLoadComponent.displayName = `Lazy(${LazyComponent.displayName || 'Component'})`;
  }

  return LazyLoadComponent;
}

/**
 * Hilfsfunktion zum Preloaden einer Komponente
 * @param importFunc - Funktion, die die Komponente importiert
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): void {
  if (typeof window !== 'undefined') {
    importFunc();
  }
}

/**
 * Hilfsfunktion zum Preloaden mehrerer Komponenten
 * @param importFuncs - Array von Funktionen, die Komponenten importieren
 */
export function preloadComponents(
  importFuncs: Array<() => Promise<{ default: any }>>
): void {
  if (typeof window !== 'undefined') {
    importFuncs.forEach(importFunc => {
      importFunc();
    });
  }
}

/**
 * Lazy-Loading für Seiten
 * @param importFunc - Funktion, die die Seite importiert
 */
export function lazyPage<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.ComponentType<React.ComponentProps<T>> {
  return lazyLoad(importFunc, {
    fallback: <DefaultLoadingFallback />,
    ssr: true,
  });
}

/**
 * Lazy-Loading für Komponenten mit benutzerdefinierten Fallback
 * @param importFunc - Funktion, die die Komponente importiert
 * @param fallback - Fallback-Komponente
 */
export function lazyWithFallback<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode
): React.ComponentType<React.ComponentProps<T>> {
  return lazyLoad(importFunc, { fallback });
}

/**
 * Lazy-Loading für Komponenten mit Preloading
 * @param importFunc - Funktion, die die Komponente importiert
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): React.ComponentType<React.ComponentProps<T>> {
  return lazyLoad(importFunc, { preload: true });
} 