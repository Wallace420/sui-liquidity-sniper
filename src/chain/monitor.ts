import { EventId, SuiClient, SuiEvent, SuiEventFilter } from "@mysten/sui/client";
import { prisma } from "../db";
import { SUI, MIGRATOR_MOVE_PUMP } from "./config";
import { getTransactionInfo } from "./extractor";
import { trade } from "../trader";

const POLLING_INTERVAL_MS = 100

type SuiEventsCursor = EventId | null | undefined

type EventExecutionResult = {
  cursor: SuiEventsCursor,
  hasNextPage: boolean
}


type EventTracker = {
  type: string,
  filter: SuiEventFilter,
  callback: (events: SuiEvent[], type: string) => any;
}


const EVENTS_TO_TRACK: EventTracker[] = [
  {
    type: "BlueMove::CreatePoolEvent",
    filter: { MoveEventType: "0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event" },
    callback: async (events: SuiEvent[], type: string) => {
      const event = events[0]
      if (event) {
        const timestampThreshold = Date.now() - 5000

        const { creator } = event.parsedJson

        if (Number(event.timestampMs) > timestampThreshold && creator === MIGRATOR_MOVE_PUMP) {
          await trade(event.id.txDigest, 'BlueMove')
        }else{
          console.log("Skipping, not realtime!")
        }
      }
    }
  },
  {
    type: "Cetus::CreatePoolEvent",
    filter: { MoveEventType: "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent" },
    callback: async (events: SuiEvent[], type: string) => {
      const event = events[0]
      if (event) {
        const timestampThreshold = Date.now() - 5000

        if (Number(event.timestampMs) > timestampThreshold) {
          await trade(event.id.txDigest, 'Cetus')
        }else{
          console.log("Skipping, not realtime!")
        }
      }
    }
  }
]


const executeEventJob = async (
  client: SuiClient,
  tracker: EventTracker,
  cursor: SuiEventsCursor
): Promise<EventExecutionResult> => {
  try {
    const { data, hasNextPage, nextCursor } = await client.queryEvents({
      query: tracker.filter,
      cursor,
      order: 'ascending'
    })

    await tracker.callback(data, tracker.type)

    if (nextCursor && data.length > 0) {
      await saveLatestCursor(tracker, nextCursor)

      return {
        cursor: nextCursor,
        hasNextPage
      }
    }
  } catch (e) {
    console.log(e)
  }

  return {
    cursor,
    hasNextPage: false
  }

}


const saveLatestCursor = async (tracker: EventTracker, cursor: SuiEventsCursor) => {
  const data = {
    eventSeq: cursor!.eventSeq,
    txDigest: cursor!.txDigest
  }

  return prisma.cursor.upsert({
    where: {
      id: tracker.type
    },
    update: data,
    create: { ...data, id: tracker.type }
  })
}

const getLatestCursor = async (tracker: EventTracker) => {
  const cursor = await prisma.cursor.findUnique({
    where: {
      id: tracker.type,
    },
  });

  return cursor || undefined;
};

const runEventJob = async (client: SuiClient, tracker: EventTracker, cursor: SuiEventsCursor) => {
  const result = await executeEventJob(client, tracker, cursor);

  // Trigger a timeout. Depending on the result, we either wait 0ms or the polling interval.
  setTimeout(
    () => {
      runEventJob(client, tracker, result.cursor);
    },
    result.hasNextPage ? 0 : POLLING_INTERVAL_MS,
  );
};

const getLastestCursorOnInit = async (client: SuiClient) => {
  for (const events of EVENTS_TO_TRACK) {
    //console.log("Lastest cursor", cursor)
    EVENTS_TO_TRACK.forEach(async (event) => {
      const { data } = await client.queryEvents({
        query: event.filter,
        order: 'descending'
      })

      await saveLatestCursor(event, data[0].id)
    })
  }
}


export const setupListeners = async () => {
  await getLastestCursorOnInit(SUI.client)

  for (const events of EVENTS_TO_TRACK) {
    runEventJob(SUI.client, events, await getLatestCursor(events))
  }
}
