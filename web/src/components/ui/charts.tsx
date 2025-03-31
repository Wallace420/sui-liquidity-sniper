"use client";

import React from 'react';
import { cn } from '../../lib/utils';

// Typen für die Chart-Komponenten
interface ChartProps {
  data: any[];
  index: string;
  categories: string[];
  colors?: string[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  showGridLines?: boolean;
  showAnimation?: boolean;
  className?: string;
}

// Einfache Implementierung eines Liniendiagramms
export function LineChart({
  data,
  index,
  categories,
  colors = ['blue', 'green', 'red', 'purple', 'orange'],
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showAnimation = true,
  className,
}: ChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-muted-foreground">Nicht genügend Daten für die Anzeige</p>
      </div>
    );
  }

  // Berechne Min/Max für die Y-Achse
  const allValues = data.flatMap(item => categories.map(cat => Number(item[cat]) || 0));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10% Padding
  
  const chartHeight = 200;
  const chartWidth = 100;

  // Generiere Pfade für die Linien
  const paths = categories.map((category, categoryIndex) => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const value = Number(item[category]) || 0;
      const y = chartHeight - ((value - minValue + padding) / (range + padding * 2)) * chartHeight;
      return `${x},${y}`;
    });
    
    return {
      category,
      path: `M ${points.join(' L ')}`,
      color: colors[categoryIndex % colors.length],
    };
  });

  return (
    <div className={cn("w-full h-full", className)}>
      <div className="relative h-full w-full">
        {/* Y-Achse Beschriftungen */}
        <div className="absolute top-0 left-0 text-xs text-muted-foreground">
          {valueFormatter(maxValue + padding)}
        </div>
        <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">
          {valueFormatter(minValue - padding)}
        </div>
        
        {/* Gitterlinien */}
        {showGridLines && (
          <div className="absolute inset-0 border-b border-l border-border">
            {[0.25, 0.5, 0.75].map((pos) => (
              <div 
                key={pos} 
                className="absolute border-t border-dashed border-border" 
                style={{ top: `${pos * 100}%`, width: '100%' }}
              />
            ))}
          </div>
        )}
        
        {/* SVG für die Linien */}
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          {paths.map(({ category, path, color }) => (
            <path
              key={category}
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="2"
              className={showAnimation ? "animate-draw-line" : ""}
            />
          ))}
        </svg>
        
        {/* X-Achse Beschriftungen */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
          {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((item, i) => (
            <div key={i}>
              {typeof item[index] === 'string' && item[index].includes('T') 
                ? new Date(item[index]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : item[index]}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legende */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {categories.map((category, i) => (
            <div key={category} className="flex items-center">
              <div 
                className="w-3 h-3 mr-1 rounded-full" 
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-xs">{category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Flächendiagramm-Implementierung
export function AreaChart({
  data,
  index,
  categories,
  colors = ['blue', 'green', 'red', 'purple', 'orange'],
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showAnimation = true,
  className,
}: ChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-muted-foreground">Nicht genügend Daten für die Anzeige</p>
      </div>
    );
  }

  // Berechne Min/Max für die Y-Achse
  const allValues = data.flatMap(item => categories.map(cat => Number(item[cat]) || 0));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const padding = range * 0.1; // 10% Padding
  
  const chartHeight = 200;
  const chartWidth = 100;

  // Generiere Pfade für die Flächen
  const areas = categories.map((category, categoryIndex) => {
    const points = data.map((item, index) => {
      const x = (index / (data.length - 1)) * chartWidth;
      const value = Number(item[category]) || 0;
      const y = chartHeight - ((value - minValue + padding) / (range + padding * 2)) * chartHeight;
      return `${x},${y}`;
    });
    
    // Erstelle einen geschlossenen Pfad für die Fläche
    const areaPath = `
      M ${points[0]} 
      L ${points.join(' L ')} 
      L ${chartWidth},${chartHeight} 
      L 0,${chartHeight} 
      Z
    `;
    
    return {
      category,
      path: `M ${points.join(' L ')}`,
      areaPath,
      color: colors[categoryIndex % colors.length],
    };
  });

  return (
    <div className={cn("w-full h-full", className)}>
      <div className="relative h-full w-full">
        {/* Y-Achse Beschriftungen */}
        <div className="absolute top-0 left-0 text-xs text-muted-foreground">
          {valueFormatter(maxValue + padding)}
        </div>
        <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">
          {valueFormatter(minValue - padding)}
        </div>
        
        {/* Gitterlinien */}
        {showGridLines && (
          <div className="absolute inset-0 border-b border-l border-border">
            {[0.25, 0.5, 0.75].map((pos) => (
              <div 
                key={pos} 
                className="absolute border-t border-dashed border-border" 
                style={{ top: `${pos * 100}%`, width: '100%' }}
              />
            ))}
          </div>
        )}
        
        {/* SVG für die Flächen und Linien */}
        <svg 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          {areas.map(({ category, path, areaPath, color }) => (
            <React.Fragment key={category}>
              <path
                d={areaPath}
                fill={color}
                fillOpacity="0.2"
                className={showAnimation ? "animate-fade-in" : ""}
              />
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2"
                className={showAnimation ? "animate-draw-line" : ""}
              />
            </React.Fragment>
          ))}
        </svg>
        
        {/* X-Achse Beschriftungen */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
          {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((item, i) => (
            <div key={i}>
              {typeof item[index] === 'string' && item[index].includes('T') 
                ? new Date(item[index]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : item[index]}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legende */}
      {showLegend && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {categories.map((category, i) => (
            <div key={category} className="flex items-center">
              <div 
                className="w-3 h-3 mr-1 rounded-full" 
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-xs">{category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Balkendiagramm-Implementierung
export function BarChart({
  data,
  index,
  categories,
  colors = ['blue', 'green', 'red', 'purple', 'orange'],
  valueFormatter = (value) => `${value}`,
  showLegend = true,
  showGridLines = true,
  showAnimation = true,
  className,
}: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <p className="text-muted-foreground">Nicht genügend Daten für die Anzeige</p>
      </div>
    );
  }

  // Berechne Max für die Y-Achse (Balkendiagramme starten normalerweise bei 0)
  const allValues = data.flatMap(item => categories.map(cat => Number(item[cat]) || 0));
  const maxValue = Math.max(...allValues);
  const padding = maxValue * 0.1; // 10% Padding
  
  const barWidth = 100 / (data.length * categories.length * 1.5); // Balkenbreite mit Abstand

  return (
    <div className={cn("w-full h-full", className)}>
      <div className="relative h-full w-full">
        {/* Y-Achse Beschriftungen */}
        <div className="absolute top-0 left-0 text-xs text-muted-foreground">
          {valueFormatter(maxValue + padding)}
        </div>
        <div className="absolute bottom-0 left-0 text-xs text-muted-foreground">
          {valueFormatter(0)}
        </div>
        
        {/* Gitterlinien */}
        {showGridLines && (
          <div className="absolute inset-0 border-b border-l border-border">
            {[0.25, 0.5, 0.75].map((pos) => (
              <div 
                key={pos} 
                className="absolute border-t border-dashed border-border" 
                style={{ top: `${pos * 100}%`, width: '100%' }}
              />
            ))}
          </div>
        )}
        
        {/* Balken */}
        <div className="absolute inset-0 flex items-end justify-around">
          {data.map((item, itemIndex) => (
            <div key={itemIndex} className="flex items-end h-full">
              {categories.map((category, categoryIndex) => {
                const value = Number(item[category]) || 0;
                const height = `${(value / (maxValue + padding)) * 100}%`;
                
                return (
                  <div 
                    key={`${itemIndex}-${category}`}
                    className={cn(
                      "mx-0.5 rounded-t",
                      showAnimation ? "animate-grow-up" : ""
                    )}
                    style={{ 
                      height, 
                      width: `${barWidth}%`,
                      backgroundColor: colors[categoryIndex % colors.length],
                    }}
                    title={`${item[index]}: ${valueFormatter(value)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        
        {/* X-Achse Beschriftungen */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-around text-xs text-muted-foreground pt-2">
          {data.map((item, i) => (
            <div key={i} className="text-center truncate max-w-[60px]">
              {item[index]}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legende */}
      {showLegend && categories.length > 1 && (
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {categories.map((category, i) => (
            <div key={category} className="flex items-center">
              <div 
                className="w-3 h-3 mr-1 rounded-full" 
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-xs">{category}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 