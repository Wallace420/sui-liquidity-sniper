import { ParsedPoolData } from "../chain/extractor";
import { getAccounActivity } from "../services/suivision";


const blackList = [
  "DAM",
]

export async function scamProbability(poolInfo: ParsedPoolData) {
  let pages = 0;
  let lastCursor: string | null = null
  let lastActivity: any = null
  let scamProbability = 0

  do {
    const activities = await getAccounActivity(poolInfo!.creator, lastCursor)

    if(activities.cursor === lastCursor){
       break
    }

    if(!lastCursor){
      lastCursor = activities.cursor
    }

    if(activities.cursor !== lastCursor){
      lastCursor = activities.cursor
      pages++
    }

    lastActivity = activities.activities;
  } while (pages <= 5)

  const firstActivity = lastActivity[lastActivity.length - 1]

  const isRecent = (new Date().getTime() - firstActivity.timestampMs) < 1000 * 60 * 60 * 24 

  if (isRecent){
    scamProbability += 50
  }

  if (pages < 5){
    scamProbability += 50
  }

  return scamProbability
}


export function checkIsBlackListed(coin: string) {
  const end = coin.split('::')[2]

  if (blackList.includes(end)) {
    return true
  }

  return false
}
