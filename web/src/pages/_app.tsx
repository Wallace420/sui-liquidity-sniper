import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { setupGlobalErrorHandlers } from '@/lib/error-handling';
import { setupCacheCleanup } from '@/lib/cache';

export default function App({ Component, pageProps }: AppProps) {
  // Globale Fehlerhandler und Cache-Bereinigung einrichten
  useEffect(() => {
    // Globale Fehlerhandler einrichten
    setupGlobalErrorHandlers();
    
    // Cache-Bereinigung einrichten
    const cleanupCache = setupCacheCleanup();
    
    // Aufräumen beim Unmount
    return () => {
      cleanupCache();
    };
  }, []);
  
  return <Component {...pageProps} />;
} 