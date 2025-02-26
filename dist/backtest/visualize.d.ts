import { TimedBacktestResult } from './runBacktest';
interface VisualizationConfig {
    outputDir: string;
    includeMetrics?: {
        profitability?: boolean;
        riskMetrics?: boolean;
        efficiency?: boolean;
        scamDetection?: boolean;
    };
    format?: 'html' | 'json';
}
declare function visualizeResults(results: TimedBacktestResult[], config: VisualizationConfig): Promise<{
    outputPath: string;
    format: "html" | "json";
    chartsGenerated: number;
}>;
export { visualizeResults, VisualizationConfig };
