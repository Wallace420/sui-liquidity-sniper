export interface Transaction {
  // Define the properties of a Transaction
  id: string;
  amount: number;
  date: Date;
}

export interface ClusterNode {
  // Define the properties of a ClusterNode
  id: string;
  status: string;
}

export interface Assets {
  // Define the properties of Assets
  id: string;
  value: number;
}

export interface Operation {
  // Define the properties of an Operation
  id: string;
  type: string;
}

export interface Congestion {
  // Define the properties of Congestion
  level: number;
  description: string;
}