import TelegramBot from 'node-telegram-bot-api';
import { getSuiPrice } from '@7kprotocol/sdk-ts';
import { getTrade } from '../db/trade';
import { SUI } from '../chain/config';
import dotenv from 'dotenv';

let USDollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 10
});

let isCallbackQueryListenerRegistered = false;
let lastUpdateMessageId: number | null = null
let lastUpdateMessageTime: number | null = null
let isSendingUpdateMessage = false

dotenv.config();

const token = process.env.TELEGRAM_TOKEN || '';
const bot = new TelegramBot(token, { polling: true });
let lastMessageId = 0;


export async function sendBuyMessage({
  tokenAddress,
  tokenAmount,
  buyDigest,
  dex,
  poolAddress,
  suiSpentAmount,
  sellAction,
  scamProbability
}) {
  const suiPrice = await getSuiPrice();

  function scamInfo(scamProbability: number){
    if (scamProbability === 100) {
      return "✅"
    }else if (scamProbability === 50) {
      return "🟡"      
    }else {
      return "❌"
    }
  }


  const message = `
  🟢 *Token bought* 🟢 

  🔴 *Scam Probability: ${scamInfo(scamProbability)}* 🔴 

  🔹 *Dex information:* 
  🔹 *Name:* ${dex}
  🔹 *Pool Address:* \ ${poolAddress}

  🔹 *Token information:* 
  🔹 *Address:* \ ${tokenAddress}
  🔹 *Name:* ${tokenAddress.split("::")[1]}
  🔹 *Symbol:* ${tokenAddress.split("::")[2]}
  
  🔸 *Amount:* \ ${Number(tokenAmount) / Math.pow(10, 9)}
     *SUI Spent:* \ ${Number(suiSpentAmount) / Math.pow(10, 9)}
     
     *SUI Price:* \ ${USDollar.format(suiPrice)}
     *SUI Total Value:* \ ${USDollar.format(Number(suiSpentAmount / Math.pow(10, 9)) * suiPrice)}

  ============================
  ⏱ *Date:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
  `;

  const buttons = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔗 Explorer', url: `https://suivision.xyz/txblock/${buyDigest}` },
        ],
        [
          { text: '🔴 Sell now 🔴', callback_data: 'forced_sell' },
        ],
      ]
    },
  };

  if (!isCallbackQueryListenerRegistered) {
    bot.on('callback_query', (query) => {
      const chatId = query.message.chat.id;
      const data = query.data; // callback_data do botão

      if (data === 'forced_sell') {
        bot.sendMessage(chatId, 'will sell now!');
        sellAction()
      }

      // Opcional: responde ao callback para evitar timeout
      bot.answerCallbackQuery(query.id, { text: 'will sell now!' });
    });

    isCallbackQueryListenerRegistered = true
  }

  bot.sendMessage(process.env.TELEGRAM_GROUP_ID as string, message, buttons);

}


export async function sendSellMessage(digest: string, poolAddress: string) {
  const { client } = SUI
  const suiPrice = await getSuiPrice();

  const sellBlock = await client.getTransactionBlock({
    digest: digest,
    options: {
      showBalanceChanges: true
    }
  })

  const trade = await getTrade(poolAddress)

  const { balanceChanges } = sellBlock

  if (!balanceChanges) return null;

  const suiBalance = balanceChanges.find((b: any) => b.coinType.endsWith("::sui::SUI"))
  const tokenBalance = balanceChanges.find((b: any) => !b.coinType.endsWith("::sui::SUI"))

  const message = `
  🔴 *Token sold* 🔴 

  🔹 *Token information:* 
  🔹 *Address:* \ ${tokenBalance!.coinType}
  🔹 *Name:* ${tokenBalance!.coinType.split("::")[1]}
  🔹 *Symbol:* ${tokenBalance!.coinType.split("::")[2]}
  
  🔸 *Qnt sold:* \ ${Number(tokenBalance!.amount) / Math.pow(10, 9)}
     
     *Total buy:* \ ${USDollar.format((Number(trade?.suiSpentAmount) / Math.pow(10, 9) * suiPrice))}
     *Total sold:* \ ${USDollar.format((Number(suiBalance!.amount) / Math.pow(10, 9)) * suiPrice)}

  ============================
  ⏱ *Date:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
  `;

  const buttons = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🔗 Explorer', url: `https://suivision.xyz/txblock/${digest}` },
        ],
      ]
    },
  };


  await bot.sendMessage(process.env.TELEGRAM_GROUP_ID as string, message, buttons);
}


export async function sendUpdateMessage({
  variacao,
  tokenAddress,
  max,
  stop
}) {
  if(!lastUpdateMessageTime) {
    lastUpdateMessageTime = new Date().getTime()
  }

  if ((Math.abs(new Date().getTime() - lastUpdateMessageTime)) < 3000) {
    return;
  }

  if(isSendingUpdateMessage){
    return;
  }

  isSendingUpdateMessage = true

  const message = `
  🟢 *Trade Update* 🟢 
     
  🔹 *Token:* ${tokenAddress.split("::")[2]} 

  🔹 *Variation:* ${variacao > 0 ? "🟢" : "🔴"} ${variacao.toFixed(2)} %
  ============================

  🔸 *StopLoss:* 🔴  %${stop.toFixed(2)} 
  🔸 *Sell is enabled:* ${max > 0 ? "🟢" : "🔴"} 

  ============================
  ⏱ *Date:* ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
  `;

  if(lastUpdateMessageId) {
    bot.deleteMessage(process.env.TELEGRAM_GROUP_ID as string, lastUpdateMessageId)
  }

  bot.sendMessage(process.env.TELEGRAM_GROUP_ID as string, message).then((sentMessage) => {
    lastUpdateMessageId = sentMessage.message_id
    lastUpdateMessageTime = new Date().getTime()
    isSendingUpdateMessage = false
  })
}


export function sendErrorMessage({
  message
}){
  bot.sendMessage(process.env.TELEGRAM_GROUP_ID as string, message);
}

