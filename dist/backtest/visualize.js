import { logError } from '../utils/logger';
import { writeFileSync } from 'fs';
import { join } from 'path';
function generateChartHtml(chartData, titles) {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Backtest Results Visualization</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    .chart-container {
      width: 800px;
      height: 400px;
      margin: 20px auto;
    }
    .metrics-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      font-family: Arial, sans-serif;
    }
    .metric-card {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 15px;
      margin: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .metric-title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .metric-value {
      font-size: 24px;
      color: #2c3e50;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
  </style>
</head>
<body>
  <div class="metrics-container">
    ${chartData.map((data, index) => `
      <div class="chart-container">
        <canvas id="chart${index}"></canvas>
      </div>
    `).join('')}
  </div>

  <script>
    const chartData = ${JSON.stringify(chartData)};
    const titles = ${JSON.stringify(titles)};
    
    chartData.forEach((data, index) => {
      const ctx = document.getElementById('chart' + index).getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: titles[index]
            },
            tooltip: {
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    });
  </script>
</body>
</html>
`;
}
function generateProfitabilityChart(results) {
    const sortedResults = [...results].sort((a, b) => a.startTime - b.startTime);
    return {
        labels: sortedResults.map(r => new Date(r.startTime).toLocaleDateString()),
        datasets: [
            {
                label: 'Total Profit',
                data: sortedResults.map(r => r.totalProfit),
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)',
                fill: true
            },
            {
                label: 'Win Rate',
                data: sortedResults.map(r => r.winRate),
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true
            }
        ]
    };
}
function generateRiskMetricsChart(results) {
    const sortedResults = [...results].sort((a, b) => a.startTime - b.startTime);
    return {
        labels: sortedResults.map(r => new Date(r.startTime).toLocaleDateString()),
        datasets: [
            {
                label: 'Max Drawdown',
                data: sortedResults.map(r => r.maxDrawdown),
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                fill: true
            }
        ]
    };
}
function generateEfficiencyChart(results) {
    const sortedResults = [...results].sort((a, b) => a.startTime - b.startTime);
    return {
        labels: sortedResults.map(r => new Date(r.startTime).toLocaleDateString()),
        datasets: [
            {
                label: 'Execution Time (ms)',
                data: sortedResults.map(r => r.averageExecutionTime),
                borderColor: '#9b59b6',
                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                fill: true
            },
            {
                label: 'Gas Used',
                data: sortedResults.map(r => r.gasUsed),
                borderColor: '#f1c40f',
                backgroundColor: 'rgba(241, 196, 15, 0.1)',
                fill: true
            }
        ]
    };
}
function generateScamDetectionChart(results) {
    const sortedResults = [...results].sort((a, b) => a.startTime - b.startTime);
    return {
        labels: sortedResults.map(r => new Date(r.startTime).toLocaleDateString()),
        datasets: [
            {
                label: 'Scam Detection Accuracy',
                data: sortedResults.map(r => r.scamDetectionAccuracy),
                borderColor: '#1abc9c',
                backgroundColor: 'rgba(26, 188, 156, 0.1)',
                fill: true
            }
        ]
    };
}
async function visualizeResults(results, config) {
    try {
        const charts = [];
        const titles = [];
        // Add charts based on config
        if (!config.includeMetrics || config.includeMetrics.profitability) {
            charts.push(generateProfitabilityChart(results));
            titles.push('Profitability Metrics');
        }
        if (!config.includeMetrics || config.includeMetrics.riskMetrics) {
            charts.push(generateRiskMetricsChart(results));
            titles.push('Risk Metrics');
        }
        if (!config.includeMetrics || config.includeMetrics.efficiency) {
            charts.push(generateEfficiencyChart(results));
            titles.push('Efficiency Metrics');
        }
        if (!config.includeMetrics || config.includeMetrics.scamDetection) {
            charts.push(generateScamDetectionChart(results));
            titles.push('Scam Detection Accuracy');
        }
        // Generate output
        const format = config.format || 'html';
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `backtest-results-${timestamp}.${format}`;
        const outputPath = join(config.outputDir, filename);
        if (format === 'html') {
            const html = generateChartHtml(charts, titles);
            writeFileSync(outputPath, html);
        }
        else {
            writeFileSync(outputPath, JSON.stringify({ charts, titles }, null, 2));
        }
        return {
            outputPath,
            format,
            chartsGenerated: charts.length
        };
    }
    catch (error) {
        logError('Failed to generate visualization', {
            error: error instanceof Error ? error.message : 'Unknown error',
            config
        });
        throw error;
    }
}
// Helper function to generate color schemes
function generateColorScheme(numColors) {
    const baseColors = [
        '#2ecc71', // Green
        '#3498db', // Blue
        '#e74c3c', // Red
        '#f1c40f', // Yellow
        '#9b59b6', // Purple
        '#1abc9c', // Turquoise
        '#e67e22', // Orange
        '#34495e' // Navy
    ];
    if (numColors <= baseColors.length) {
        return baseColors.slice(0, numColors);
    }
    // Generate additional colors if needed
    const colors = [...baseColors];
    while (colors.length < numColors) {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        colors.push(`rgb(${r},${g},${b})`);
    }
    return colors;
}
// Example usage
async function main() {
    // This would be your actual backtest results
    const mockResults = [
    /* ... mock data ... */
    ];
    const config = {
        outputDir: './reports',
        includeMetrics: {
            profitability: true,
            riskMetrics: true,
            efficiency: true,
            scamDetection: true
        },
        format: 'html'
    };
    try {
        const result = await visualizeResults(mockResults, config);
        console.log(`Visualization generated successfully at: ${result.outputPath}`);
        return result;
    }
    catch (error) {
        console.error('Visualization generation failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
export { visualizeResults };
//# sourceMappingURL=visualize.js.map