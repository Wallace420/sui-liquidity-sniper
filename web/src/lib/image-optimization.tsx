/**
 * Utilities für die Bildoptimierung
 * Verbessert die Ladezeit durch optimierte Bildressourcen
 */

import React from 'react';
import Image, { ImageProps } from 'next/image';

// Typen für die Bildoptimierung
interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  lowQualityPlaceholder?: boolean;
  lazyBoundary?: string;
}

/**
 * Optimiertes Bild mit Fallback und Lazy-Loading
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  fallbackSrc = '/images/placeholder.svg',
  lowQualityPlaceholder = true,
  lazyBoundary = '200px',
  alt,
  width,
  height,
  ...props
}) => {
  const [imgSrc, setImgSrc] = React.useState<string>(src);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  // Fehlerbehandlung für Bilder
  const handleError = () => {
    console.warn(`Fehler beim Laden des Bildes: ${src}`);
    setImgSrc(fallbackSrc);
  };

  // Lade-Event-Handler
  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${isLoading ? 'animate-pulse bg-gray-200' : ''}`}>
      <Image
        src={imgSrc}
        alt={alt || 'Bild'}
        width={width}
        height={height}
        loading="lazy"
        lazyBoundary={lazyBoundary}
        placeholder={lowQualityPlaceholder ? 'blur' : 'empty'}
        blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlMmUyZTIiLz48L3N2Zz4="
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    </div>
  );
};

/**
 * Optimiertes Hintergrundbild mit Lazy-Loading
 */
export const OptimizedBackgroundImage: React.FC<{
  src: string;
  fallbackSrc?: string;
  className?: string;
  children?: React.ReactNode;
}> = ({
  src,
  fallbackSrc = '/images/placeholder.svg',
  className = '',
  children,
}) => {
  const [imgSrc, setImgSrc] = React.useState<string>(src);
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Bild vorladen und Fehlerbehandlung
  React.useEffect(() => {
    // HTMLImageElement verwenden statt des Image-Konstruktors
    const img = document.createElement('img');
    img.src = src;
    img.onload = () => {
      setImgSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      console.warn(`Fehler beim Laden des Hintergrundbildes: ${src}`);
      setImgSrc(fallbackSrc);
      setIsLoaded(true);
    };
  }, [src, fallbackSrc]);

  return (
    <div
      className={`relative ${className} ${!isLoaded ? 'animate-pulse bg-gray-200' : ''}`}
      style={{
        backgroundImage: `url(${imgSrc})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {children}
    </div>
  );
};

/**
 * Lazy-Loading für Bilder mit Intersection Observer
 */
export const LazyImage: React.FC<OptimizedImageProps> = (props) => {
  const [isVisible, setIsVisible] = React.useState<boolean>(false);
  const imgRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: props.lazyBoundary || '200px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [props.lazyBoundary]);

  return (
    <div ref={imgRef} className="relative">
      {isVisible ? (
        <OptimizedImage {...props} />
      ) : (
        <div
          style={{ width: props.width, height: props.height }}
          className="bg-gray-200 animate-pulse"
        />
      )}
    </div>
  );
};

/**
 * Responsive Bildgrößen für verschiedene Bildschirmgrößen
 */
export const getResponsiveImageSizes = (
  baseSize: number = 100,
  options: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  } = {}
): string => {
  const { sm = 1, md = 1, lg = 1, xl = 1, xxl = 1 } = options;
  
  return `
    (max-width: 640px) ${baseSize * sm}px,
    (max-width: 768px) ${baseSize * md}px,
    (max-width: 1024px) ${baseSize * lg}px,
    (max-width: 1280px) ${baseSize * xl}px,
    ${baseSize * xxl}px
  `.trim();
};

/**
 * Bildformate für verschiedene Browser optimieren
 */
export const getOptimizedImageFormats = (
  basePath: string,
  formats: ('webp' | 'avif' | 'jpg' | 'png')[] = ['webp', 'jpg']
): string[] => {
  const basePathWithoutExt = basePath.replace(/\.[^/.]+$/, '');
  
  return formats.map(format => `${basePathWithoutExt}.${format}`);
}; 