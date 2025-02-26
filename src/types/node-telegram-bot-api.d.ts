declare module 'node-telegram-bot-api' {
  interface SendMessageOptions {
    parse_mode?: 'Markdown' | 'HTML';
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    reply_to_message_id?: number;
  }

  class TelegramBot {
    constructor(token: string, options?: { polling: boolean });
    sendMessage(chatId: string | number, text: string, options?: SendMessageOptions): Promise<any>;
    on(event: 'error' | 'polling_error', listener: (error: Error) => void): this;
  }

  export = TelegramBot;
}
