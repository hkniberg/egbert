import {ChatSource} from "./chat-source";
import {MinecraftChatSourceConfig} from "../config";
import {Rcon} from "rcon-client";
import {Tail} from "tail";
import {Bot} from "../bot";
import {CappedArray} from "../util/capped-array";

export class MinecraftChatSource extends ChatSource {
    private readonly typeSpecificConfig: MinecraftChatSourceConfig;
    private readonly minecraftLogRegExp: RegExp;
    private readonly chatHistory: CappedArray<string>;

    constructor(name: string, defaultSocialContext: string | null, maxChatHistoryLength: number, typeSpecificConfig: MinecraftChatSourceConfig) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        if (!defaultSocialContext) {
            throw new Error("MinecraftChatSource must have a default social context");
        }
        this.typeSpecificConfig = typeSpecificConfig;
        this.chatHistory = new CappedArray<string>(maxChatHistoryLength);
        console.log("Minecraft chat source created: ", this.name);

        // This regexp is used to filter the messages in the server log to only the ones we care about.
        // And also to strip out timestamp and other boilerplate.
        const defaultRegexPattern = /(?:DedicatedServer\/]:\s|\[Bot server]:\s)(.*)/;
        const regexPatternToUse = this.typeSpecificConfig.regexPattern as string ? this.typeSpecificConfig.regexPattern : defaultRegexPattern;
        this.minecraftLogRegExp = new RegExp(regexPatternToUse);
    }

    start(): void {
        const tail = new Tail(this.typeSpecificConfig.serverLogPath);
        tail.on('line', async (line) => {
            await this.processLine(line.toString());
        });

        tail.on('error', (error) => {
            console.error(`MinecraftChatSource Error: ${error}`);
        });

        console.log("Minecraft chat source started: ", this.typeSpecificConfig.serverLogPath);
    }

    async processLine(line : string) {
        const strmatch = line.match(this.minecraftLogRegExp)
        if (!strmatch) {
            // this is a log message that we don't care about
            return;
        }

        const messageToSendToBot = strmatch[1].trim()

        console.log(`Got message from Minecraft server log: ${messageToSendToBot}`);

        const messagesToAddToChatHistory: string[] = [messageToSendToBot];

        const respondingBots: Bot[] = this.getRespondingBots(messageToSendToBot)
        if (respondingBots.length === 0) {
            // early out so we don't waste time reading the chat history when we aren't going to respond anyway
            console.log("No bots want to respond to this message");
            // We will add this message to our chat history even if no bots respond
            // That way, when we talk to a bot it will be aware of the context of the conversation
            this.chatHistory.addAll(messagesToAddToChatHistory);
            return;
        }

        for (const bot of respondingBots) {
            const responseMessage = await bot.generateResponse(this.defaultSocialContext as string, messageToSendToBot, this.chatHistory.getAll());
            if (responseMessage) {
                // technically we could skip await and do these in paralell, but for now I'm choosing the path of least risk
                const responseMessageWithBotName = `<${bot.getName()}> ${responseMessage}`;
                messagesToAddToChatHistory.push(responseMessageWithBotName);
                await this.sendChatToMinecraftServer(responseMessageWithBotName);
            }
        }
        // We defer this to the end so that the chat history doesn't get updated while we are still generating responses
        this.chatHistory.addAll(messagesToAddToChatHistory);
    }

    private getRespondingBots(message: string) {
        return this.bots
            .filter(bot => bot.willRespond(this.defaultSocialContext as string, message))
            .filter(bot => !this.isMessageFromBot(message, bot));
    }

    private async sendChatToMinecraftServer(responseMessageWithBotName : string) {
        const rcon = await Rcon.connect({
            host: this.typeSpecificConfig.rconHost,
            port: this.typeSpecificConfig.rconPort,
            password: this.typeSpecificConfig.rconPassword,
        });

        console.log("Sending message to Minecraft server: " + responseMessageWithBotName)

        let escapedMessageWithBotName = JSON.stringify(responseMessageWithBotName);
        let response = await rcon.send(`tellraw @a {"text":${escapedMessageWithBotName}, "color":"white"}`);

        console.log(".... sent message, got response: ", response);

        await rcon.end();
    }

    /**
     * This is to prevent a bot from responding to its own messages
     */
    private isMessageFromBot(message: string, bot : Bot) {
        return message.indexOf(`<${bot.getName()}>`) >= 0;
    }
}



