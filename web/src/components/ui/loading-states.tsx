/**
 * Komponenten für verschiedene Ladezustände
 * Werden für Lazy-Loading und asynchrone Operationen verwendet
 */

import React from 'react';

// Typen für die Ladezustände
interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'accent' | 'white';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  className?: string;
  count?: number;
}

/**
 * Spinner-Komponente für Ladezustände
 */
export const Spinner: React.FC<LoadingProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  // Größen-Mapping
  const sizeMap = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  // Farben-Mapping
  const colorMap = {
    primary: 'border-primary border-t-transparent',
    secondary: 'border-secondary border-t-transparent',
    accent: 'border-accent border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div className={`inline-block ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeMap[size]} ${colorMap[color]}`}
        role="status"
        aria-label="Lädt..."
      />
    </div>
  );
};

/**
 * Vollständige Ladeansicht mit Spinner und Text
 */
export const LoadingView: React.FC<LoadingProps> = ({
  size = 'lg',
  color = 'primary',
  text = 'Lädt...',
  fullScreen = false,
  className = '',
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'
    : 'flex flex-col items-center justify-center p-4';

  return (
    <div className={`${containerClass} ${className}`}>
      <Spinner size={size} color={color} />
      {text && (
        <p className="mt-4 text-center font-medium text-gray-700 dark:text-gray-300">
          {text}
        </p>
      )}
    </div>
  );
};

/**
 * Skeleton-Komponente für Ladezustände
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  rounded = false,
  className = '',
  count = 1,
}) => {
  const items = Array.from({ length: count }, (_, i) => i);
  
  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <>
      {items.map((i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${
            rounded ? 'rounded-full' : 'rounded'
          } ${className}`}
          style={{
            width: widthStyle,
            height: heightStyle,
            marginBottom: count > 1 && i < count - 1 ? '0.5rem' : 0,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};

/**
 * Skeleton für Tabellen
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`w-full overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 pb-2">
        {Array.from({ length: columns }, (_, i) => (
          <div key={`header-${i}`} className="flex-1 px-2">
            <Skeleton height={24} />
          </div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex py-3 border-b border-gray-100 dark:border-gray-800"
        >
          {Array.from({ length: columns }, (_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="flex-1 px-2">
              <Skeleton height={16} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton für Karten
 */
export const CardSkeleton: React.FC<{
  imageHeight?: number;
  className?: string;
}> = ({ imageHeight = 200, className = '' }) => {
  return (
    <div className={`rounded-lg overflow-hidden shadow-md ${className}`}>
      {/* Bild */}
      <Skeleton height={imageHeight} />
      
      {/* Inhalt */}
      <div className="p-4">
        <Skeleton height={24} className="mb-2" />
        <Skeleton count={3} height={16} />
        
        {/* Footer */}
        <div className="mt-4 flex justify-between">
          <Skeleton width={100} height={36} rounded />
          <Skeleton width={36} height={36} rounded />
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton für Listen
 */
export const ListSkeleton: React.FC<{
  items?: number;
  withImage?: boolean;
  className?: string;
}> = ({ items = 5, withImage = true, className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      {Array.from({ length: items }, (_, i) => (
        <div
          key={`item-${i}`}
          className="flex items-center py-3 border-b border-gray-100 dark:border-gray-800"
        >
          {withImage && (
            <div className="mr-3">
              <Skeleton width={48} height={48} rounded />
            </div>
          )}
          <div className="flex-1">
            <Skeleton height={20} className="mb-1" />
            <Skeleton height={16} width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Komponente für Fehleranzeige
 */
export const ErrorView: React.FC<{
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({ message = 'Ein Fehler ist aufgetreten.', onRetry, className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
      <svg
        className="w-12 h-12 text-red-500 mb-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
        Fehler
      </p>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}; 