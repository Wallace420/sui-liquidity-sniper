import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"
import { de } from "date-fns/locale"

/**
 * Kombiniert Tailwind-Klassen mit clsx und tailwind-merge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatiert einen Zeitstempel als lesbare Zeit
 */
export function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Formatiert einen Zeitstempel als relative Zeit (z.B. "vor 5 Minuten")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  if (!timestamp) return "-"
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: de })
}

/**
 * Formatiert eine Zahl als Währung
 */
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Formatiert eine Zahl mit Tausendertrennzeichen
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('de-DE').format(value);
}

/**
 * Formatiert eine Uptime in Sekunden als lesbare Zeit
 */
export function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Kürzt eine Adresse für die Anzeige
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Berechnet eine Farbe basierend auf einem Wert (für Risiko-Anzeige)
 */
export function getRiskColor(score: number): string {
  if (score >= 80) return "text-red-500"
  if (score >= 60) return "text-orange-500"
  if (score >= 40) return "text-yellow-500"
  if (score >= 20) return "text-blue-500"
  return "text-green-500"
}

/**
 * Verzögert die Ausführung einer Funktion
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Generiert eine zufällige ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Formatiert einen Zeitstempel als lesbare Zeit und Datum
 */
export function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Berechnet den Prozentsatz der Änderung zwischen zwei Werten
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Formatiert einen Prozentsatz mit Vorzeichen
 */
export function formatPercentage(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Verzögert die Ausführung einer Funktion
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}