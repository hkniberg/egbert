import { ChatSource } from "./chat-source";
import { Context, Telegraf } from "telegraf";
import { Update } from "typegram";
import { Bot } from "../bot";
import { TelegramChatSourceConfig } from "../config";

export class TelegramChatSource extends ChatSource {
    private readonly typeSpecificConfig: TelegramChatSourceConfig;
    private telegramClient: Telegraf<Context<Update>>;
    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        crossReferencePattern: string | null,
        typeSpecificConfig: TelegramChatSourceConfig
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength, crossReferencePattern);
        this.typeSpecificConfig = typeSpecificConfig;

        this.telegramClient = new Telegraf(this.typeSpecificConfig.botToken);

        console.log("Telegram chat source created: ", this.name);
    }

    start(): void {
        this.telegramClient.on("text", async (ctx) => {
            const triggerMessage = ctx.message.text;
            let sender = ctx.from?.first_name;
            console.log(`Received message ${triggerMessage} from user ${sender}`);

            if (!this.defaultSocialContext) {
                console.log("No default social context configured, so we will ignore the message.");
                return;
            }

            const respondingBots: Bot[] = this.getRespondingBots(this.defaultSocialContext, triggerMessage);
            if (respondingBots.length === 0) {
                console.log("No bots want to respond to this message");
                return;
            }

            for (const bot of respondingBots) {
                const responseMessage = await bot.generateResponse(
                    this.name,
                    this.defaultSocialContext,
                    sender,
                    triggerMessage,
                    []
                );
                if (responseMessage) {
                    console.log(`[${this.name} ${this.defaultSocialContext}] ${bot.getName()}: ${responseMessage}`);
                    await this.sendTelegramResponse(ctx, responseMessage);
                }
            }
        });
        this.telegramClient.launch();
        console.log("Telegram chat source started: ", this.name);
    }

    private getRespondingBots(socialContext: string, msg: string) {
        return this.bots.filter((bot) => bot.willRespond(socialContext, msg || ""));
    }

    private async sendTelegramResponse(ctx: Context, responseMessage: string) {
        console.log(`Sending response to telegram: ${responseMessage}`);
        const TELEGRAM_MESSAGE_MAX_LENGTH = 4096;
        const replyChunks = this.splitStringAtNewline(responseMessage, TELEGRAM_MESSAGE_MAX_LENGTH);
        for (let replyChunk of replyChunks) {
            if (replyChunk.length === 0) continue;
            await ctx.reply(replyChunk);
        }
    }

    private splitStringAtNewline(str: string, maxLength: number): string[] {
        let result: string[] = [];
        let current = "";
        let lines = str.split("\n");

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
