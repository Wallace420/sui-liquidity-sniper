export interface Transaction {
    digest: string;
    timestamp: number;
    sender?: string;
    success?: boolean;
    gasFee?: number;
    type?: string;
    dex?: string;
}
export interface ClusterNode {
    url: string;
    weight: number;
    status: 'active' | 'inactive' | 'error';
    lastChecked?: number;
    responseTime?: number;
    errorCount?: number;
}
