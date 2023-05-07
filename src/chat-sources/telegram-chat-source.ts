import { ChatSource } from './chat-source';
import { Message } from 'node-telegram-bot-api';
import { Bot } from '../bot';
import { TelegramChatSourceConfig } from '../config';

export class TelegramChatSource extends ChatSource {
    private readonly typeSpecificConfig: TelegramChatSourceConfig;
    private telegramClient: any;
    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        typeSpecificConfig: TelegramChatSourceConfig,
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        this.typeSpecificConfig = typeSpecificConfig;

        const TelegramBot = require('node-telegram-bot-api');
        this.telegramClient = new TelegramBot(this.typeSpecificConfig.botToken, { polling: true });

        console.log('Telegram chat source created: ', this.name);
    }

    start(): void {
        this.telegramClient.on('message', async (msg: Message) => {
            const incomingMessage = msg.text;
            console.log(`Received message ${incomingMessage} from user ${msg.from?.username}`);

            const messageToSend = `${msg.from?.username}: ${incomingMessage}`;

            if (!this.defaultSocialContext) {
                console.log('No default social context configured, so we will ignore the message.');
                return;
            }

            const respondingBots: Bot[] = this.getRespondingBots(this.defaultSocialContext, msg);
            if (respondingBots.length === 0) {
                console.log('No bots want to respond to this message');
                return;
            }

            for (const bot of respondingBots) {
                const responseMessage = await bot.generateResponse(this.defaultSocialContext, messageToSend, []);
                if (responseMessage) {
                    await this.sendTelegramResponse(msg, responseMessage);
                }
            }
        });
        console.log('Telegram chat source started: ', this.name);
    }

    private getRespondingBots(socialContext: string, msg: Message) {
        return this.bots.filter((bot) => bot.willRespond(socialContext, msg.text || ''));
    }

    private async sendTelegramResponse(msg: Message, responseMessage: string) {
        console.log(`Sending response to telegram: ${responseMessage}`);
        const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;
        const replyChunks = this.splitStringAtNewline(responseMessage, TELEGRAM_MESSAGE_MAX_LENGTH);
        for (let replyChunk of replyChunks) {
            if (replyChunk.length === 0) continue;
            await this.telegramClient.sendMessage(msg.chat.id, replyChunk);
        }
    }

    private splitStringAtNewline(str: string, maxLength: number): string[] {
        let result: string[] = [];
        let current = '';
        let lines = str.split('\n');

        for (const line of lines) {
            if (current.length + line.length + 1 > maxLength) {
                result.push(current);
                current = line;
            } else {
                current += current.length === 0 ? line : `\n${line}`;
            }
        }

        if (current.length > 0) {
            result.push(current);
        }

        return result;
    }
}
