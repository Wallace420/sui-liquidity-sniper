declare module 'node-telegram-bot-api' {
  interface SendMessageOptions {
    parse_mode?: 'Markdown' | 'HTML';
    reply_markup?: any;
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    reply_to_message_id?: number;
  }

  interface CallbackQuery {
    id: string;
    from: any;
    message?: any;
    inline_message_id?: string;
    chat_instance: string;
    data?: string;
    game_short_name?: string;
  }

  class TelegramBot {
    constructor(token: string, options?: any);
    
    // Methoden, die in der Typdefinition fehlen
    setMyCommands(commands: Array<{ command: string, description: string }>): Promise<boolean>;
    onText(regexp: RegExp, callback: (msg: any, match?: RegExpExecArray | null) => void): void;
    answerCallbackQuery(queryId: string, options?: any): Promise<boolean>;
    on(event: string, listener: (query: any) => void): this;
    
    // Standardmethoden
    sendMessage(chatId: string | number, text: string, options?: SendMessageOptions): Promise<any>;
    getMe(): Promise<any>;
    getUpdates(options?: any): Promise<any>;
    getChat(chatId: string | number): Promise<any>;
    getChatAdministrators(chatId: string | number): Promise<any>;
    getChatMembersCount(chatId: string | number): Promise<any>;
    getChatMember(chatId: string | number, userId: string | number): Promise<any>;
    kickChatMember(chatId: string | number, userId: string | number): Promise<any>;
    unbanChatMember(chatId: string | number, userId: string | number): Promise<any>;
    restrictChatMember(chatId: string | number, userId: string | number, options?: any): Promise<any>;
    promoteChatMember(chatId: string | number, userId: string | number, options?: any): Promise<any>;
    exportChatInviteLink(chatId: string | number): Promise<any>;
    setChatPhoto(chatId: string | number, photo: any): Promise<any>;
    deleteChatPhoto(chatId: string | number): Promise<any>;
    setChatTitle(chatId: string | number, title: string): Promise<any>;
    setChatDescription(chatId: string | number, description: string): Promise<any>;
    pinChatMessage(chatId: string | number, messageId: string | number): Promise<any>;
    unpinChatMessage(chatId: string | number): Promise<any>;
    leaveChat(chatId: string | number): Promise<any>;
    sendPhoto(chatId: string | number, photo: any, options?: any): Promise<any>;
    sendAudio(chatId: string | number, audio: any, options?: any): Promise<any>;
    sendDocument(chatId: string | number, doc: any, options?: any): Promise<any>;
    sendVideo(chatId: string | number, video: any, options?: any): Promise<any>;
    sendVoice(chatId: string | number, voice: any, options?: any): Promise<any>;
    sendChatAction(chatId: string | number, action: string): Promise<any>;
    sendLocation(chatId: string | number, latitude: number, longitude: number, options?: any): Promise<any>;
    sendVenue(chatId: string | number, latitude: number, longitude: number, title: string, address: string, options?: any): Promise<any>;
    sendContact(chatId: string | number, phoneNumber: string, firstName: string, options?: any): Promise<any>;
    deleteMessage(chatId: string | number, messageId: string | number): Promise<any>;
    editMessageText(text: string, options?: any): Promise<any>;
    editMessageCaption(caption: string, options?: any): Promise<any>;
    editMessageReplyMarkup(replyMarkup: any, options?: any): Promise<any>;
  }

  export = TelegramBot;
} 