import { EventId, SuiClient, SuiEvent, SuiEventFilter } from "@mysten/sui/client";
import { prisma } from "../db";
import { SUI, MIGRATOR_MOVE_PUMP } from "./config";
import { getTransactionInfo } from "./extractor";
import { trade } from "../trader";
import { Transaction, ClusterNode } from '../types'; // Adjust the import path as needed

const POLLING_INTERVAL_MS = 50; // Reduced from 100ms for faster response
const MAX_CONCURRENT_JOBS = 3;
const ERROR_RETRY_DELAY = 1000;
const MAX_ERROR_RETRIES = 3;

type SuiEventsCursor = EventId | null | undefined;

type EventExecutionResult = {
  cursor: SuiEventsCursor,
  hasNextPage: boolean,
  error?: Error
};

type EventTracker = {
  type: string,
  filter: SuiEventFilter,
  callback: (events: SuiEvent[], type: string) => Promise<void>,
  isRunning?: boolean,
  errorCount?: number,
  lastError?: Error
};

// Track active jobs and errors
const activeJobs = new Set<string>();
const errorCounts = new Map<string, number>();

const EVENTS_TO_TRACK: EventTracker[] = [
  {
    type: "BlueMove::CreatePoolEvent",
    filter: { MoveEventType: "0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event" },
    callback: async (events: SuiEvent[], type: string) => {
      const event = events[0];
      if (event) {
        const timestampThreshold = Date.now() - 5000;

        const { creator } = event.parsedJson as { creator: string };

        if (Number(event.timestampMs) > timestampThreshold && creator === MIGRATOR_MOVE_PUMP) {
          const transactionInfo = await getTransactionInfo(event.id.txDigest, 'BlueMove');
          console.log(transactionInfo); // Use the transaction info as needed
          await trade(event.id.txDigest, 'BlueMove');
        } else {
          console.log("Skipping, not realtime!");
        }
      }
    }
  },
  {
    type: "Cetus::CreatePoolEvent",
    filter: { MoveEventType: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent" },
    callback: async (events: SuiEvent[], type: string) => {
      const event = events[0];
      if (event) {
        const timestampThreshold = Date.now() - 5000;

        if (Number(event.timestampMs) > timestampThreshold) {
          const transactionInfo = await getTransactionInfo(event.id.txDigest, 'Cetus');
          console.log(transactionInfo); // Use the transaction info as needed
          await trade(event.id.txDigest, 'Cetus');
        } else {
          console.log("Skipping, not realtime!");
        }
      }
    }
  }
];

// Remora Workload Distribution
const remoraConfig = {
  clusterSize: 5, // Anzahl der Maschinen im Validator-Cluster
  tpsTarget: 100000, // Transaktionen pro Sekunde
  latencyThreshold: 1000 // Maximale Latenz in ms
};

interface LocalTransaction {
  // Define the properties of the LocalTransaction interface
}

interface LocalClusterNode {
  // Define the properties of the LocalClusterNode interface
}

const distributeWorkload = async (transaction: LocalTransaction): Promise<any> => {
  // Dynamische Lastverteilung über Validator-Cluster
  const clusterNode: LocalClusterNode = await getOptimalNode(remoraConfig.clusterSize);
  return executeTransaction(SUI.client, transaction, clusterNode);
};

// Transaction Handling für Mysticeti V2
const executeTransaction = async (client: SuiClient, transaction: LocalTransaction, clusterNode: LocalClusterNode): Promise<any> => {
  const result = await client.executeTransactionBlock({
    transactionBlock: JSON.stringify(transaction),
    signature: '', // Add the appropriate signature here
    options: {}
  });
  return result;
};

// IKA Configuration
const ikaConfig = {
  tps: 10000,
  latency: "sub-second",
  networks: ["Bitcoin", "Ethereum", "Solana", "Polygon", "Avalanche", "TON"]
};

// ZKP Configuration
const zkpConfig = {
  provider: "Groth16",
  curves: ["BN254", "BLS12-381"],
  verificationMethod: "zk-SNARKs"
};

const executeEventJob = async (
  client: SuiClient,
  tracker: EventTracker,
  cursor: SuiEventsCursor
): Promise<EventExecutionResult> => {
  if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
    return { cursor, hasNextPage: false };
  }

  const jobId = `${tracker.type}-${Date.now()}`;
  activeJobs.add(jobId);

  try {
    const { data, hasNextPage, nextCursor } = await client.queryEvents({
      query: tracker.filter,
      cursor,
      order: 'ascending'
    });

    if (data.length > 0) {
      try {
        await tracker.callback(data, tracker.type);
        errorCounts.delete(tracker.type); // Reset error count on success
      } catch (callbackError) {
        console.error(`Callback error for ${tracker.type}:`, callbackError);
        const currentErrors = (errorCounts.get(tracker.type) || 0) + 1;
        errorCounts.set(tracker.type, currentErrors);
        
        if (currentErrors >= MAX_ERROR_RETRIES) {
          throw new Error(`Max retries exceeded for ${tracker.type}`);
        }
        
        return {
          cursor,
          hasNextPage: true,
          error: callbackError as Error
        };
      }
    }

    if (nextCursor && data.length > 0) {
      await saveLatestCursor(tracker, nextCursor);
      return { cursor: nextCursor, hasNextPage };
    }

    return { cursor, hasNextPage: false };
  } catch (e) {
    console.error(`Job ${jobId} failed:`, e);
    return {
      cursor,
      hasNextPage: false,
      error: e as Error
    };
  } finally {
    activeJobs.delete(jobId);
  }
};

const saveLatestCursor = async (tracker: EventTracker, cursor: SuiEventsCursor) => {
  const data = {
    eventSeq: cursor!.eventSeq,
    txDigest: cursor!.txDigest
  };

  return prisma.cursor.upsert({
    where: {
      id: tracker.type
    },
    update: data,
    create: { ...data, id: tracker.type }
  });
};

const getLatestCursor = async (tracker: EventTracker) => {
  const cursor = await prisma.cursor.findUnique({
    where: {
      id: tracker.type,
    },
  });

  return cursor || undefined;
};

const runEventJob = async (client: SuiClient, tracker: EventTracker, cursor: SuiEventsCursor) => {
  if (tracker.isRunning) {
    return;
  }

  tracker.isRunning = true;

  try {
    const result = await executeEventJob(client, tracker, cursor);

    if (result.error) {
      console.error(`Error in event job ${tracker.type}:`, result.error);
      await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_DELAY));
    }

    // Dynamic polling interval based on activity
    const interval = result.hasNextPage ? 0 : POLLING_INTERVAL_MS;
    
    setTimeout(
      () => {
        tracker.isRunning = false;
        runEventJob(client, tracker, result.cursor);
      },
      interval
    );
  } catch (e) {
    console.error(`Fatal error in event job ${tracker.type}:`, e);
    tracker.isRunning = false;
    tracker.lastError = e as Error;
    
    // Implement exponential backoff for retries
    const retryDelay = Math.min(ERROR_RETRY_DELAY * Math.pow(2, tracker.errorCount || 0), 30000);
    setTimeout(() => {
      tracker.errorCount = (tracker.errorCount || 0) + 1;
      runEventJob(client, tracker, cursor);
    }, retryDelay);
  }
};

const getLastestCursorOnInit = async (client: SuiClient) => {
  for (const events of EVENTS_TO_TRACK) {
    //console.log("Lastest cursor", cursor)
    EVENTS_TO_TRACK.forEach(async (event) => {
      const { data } = await client.queryEvents({
        query: event.filter,
        order: 'descending'
      });

      await saveLatestCursor(event, data[0].id);
    });
  }
};

export const setupListeners = async () => {
  await getLastestCursorOnInit(SUI.client);

  for (const events of EVENTS_TO_TRACK) {
    runEventJob(SUI.client, events, await getLatestCursor(events));
  }
};

function getOptimalNode(clusterSize: number): LocalClusterNode {
  // Implement the logic to get the optimal node
  return {
    // Define the properties of the ClusterNode object
  };
}

function handleTransaction(transaction: LocalTransaction) {
  // ...existing code...
}

function handleClusterNode(transaction: Transaction, clusterNode: LocalClusterNode) {
  // ...existing code...
}
