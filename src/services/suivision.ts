const BASE_URL = "https://api.blockvision.org/v2/sui/"
import { config } from "dotenv"

config()

export async function getAccounActivity(address: string, cursor: string | null){
  const r = await fetch(`${BASE_URL}account/activities?address=${address}${cursor ? `&cursor=${cursor}` : ""}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.SUIVISION_API_KEY
    },
  })

  const response = await r.json()

  return {
    activities: response.result.data,
    cursor: response.result.nextPageCursor
  }
}




