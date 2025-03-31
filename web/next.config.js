/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Optimierungen für die Produktionsumgebung
  compiler: {
    // Entfernt Konsolenausgaben in der Produktion
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Optimierung der Bilder
  images: {
    domains: ['sui.io', 'assets.sui.io'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Webpack-Konfiguration für Bundle-Optimierung
  webpack: (config, { dev, isServer }) => {
    // Nur im Client und in der Produktion optimieren
    if (!dev && !isServer) {
      // Splitten von Chunks für besseres Caching
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor-Chunk für node_modules
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
          },
          // Separate Chunks für große Bibliotheken
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      };
      
      // Komprimierung optimieren
      config.optimization.minimize = true;
    }
    
    return config;
  },
  
  // Experimentelle Funktionen
  experimental: {
    // Optimierung für Fonts
    optimizeFonts: true,
    // Moderne Builds für neuere Browser
    modern: true,
    // Scrollwiederherstellung verbessern
    scrollRestoration: true,
  },
  
  // Umgebungsvariablen, die zur Build-Zeit verfügbar sein sollen
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
  
  // Pfad-Präfix für Deployment in Unterverzeichnissen
  basePath: '',
  
  // Aktiviere SWC-Minifier für schnellere Builds
  swcMinify: true,
  
  // Konfiguration für statische Exporte
  output: 'standalone',
};

module.exports = nextConfig; 