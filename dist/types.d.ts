export interface Transaction {
    id: string;
    amount: number;
    date: Date;
}
export interface ClusterNode {
    id: string;
    status: string;
}
export interface Assets {
    id: string;
    value: number;
}
export interface Operation {
    id: string;
    type: string;
}
export interface Congestion {
    level: number;
    description: string;
}
