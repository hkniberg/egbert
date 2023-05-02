import {ChatSource} from "./chat-source";
import {MinecraftChatSourceConfig} from "../config";
import {Rcon} from "rcon-client";
import {Tail} from "tail";
import {readLastLines} from "read-last-lines-ts";
import {Bot} from "../bot";
import * as fs from 'fs/promises';
import {CappedArray} from "../util/capped-array";


export class MinecraftChatSource extends ChatSource {
    private readonly typeSpecificConfig: MinecraftChatSourceConfig;
    private readonly minecraftLogRegExp: RegExp;

    constructor(name: string, defaultSocialContext: string | null, maxChatHistoryLength: number, typeSpecificConfig: MinecraftChatSourceConfig) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        if (!defaultSocialContext) {
            throw new Error("MinecraftChatSource must have a default social context");
        }
        this.typeSpecificConfig = typeSpecificConfig;
        console.log("Minecraft chat source created: ", this.name);

        // This regexp is used to filter the messages in the server log to only the ones we care about
        // matches either "DedicatedServer/]:" or "[Bot server]:" and captures the rest of the line
        const regexPattern = /(?:DedicatedServer\/]:\s|\[Bot server]:\s)(.*)/;    // Clean line from log time stamps etc
        this.minecraftLogRegExp = new RegExp(regexPattern);
    }

    start(): void {
        const tail = new Tail(this.typeSpecificConfig.serverLogPath);
        tail.on('line', async (line) => {
            const strmatch = line.toString().match(this.minecraftLogRegExp)
            if (!strmatch) {
                // this is a log message that we don't care about
                return;
            }

            const messageToSendToBot = strmatch[1].trim()

            console.log(`Got message from Minecraft server log: ${messageToSendToBot}`);

            const respondingBots : Bot[] = this.getRespondingBots(messageToSendToBot)
            if (respondingBots.length === 0) {
                // early out so we don't waste time reading the chat history when we aren't going to respond anyway
                console.log("No bots want to respond to this message");
                return;
            }

            let chatHistory = await this.getServerLogHistory();

            for (const bot of respondingBots) {
                const responseMessage = await bot.generateResponse(this.defaultSocialContext as string, messageToSendToBot, chatHistory);
                if (responseMessage) {
                    // technically we could skip await and do these in paralell, but for now I'm choosing the path of least risk
                    await this.sendChatToMinecraftServer(bot.getName(), responseMessage);
                }
            }
        });

        tail.on('error', (error) => {
            console.error(`MinecraftChatSource Error: ${error}`);
        });

        console.log("Minecraft chat source started: ", this.typeSpecificConfig.serverLogPath);
    }

    private getRespondingBots(message: string) {
        return this.bots
            .filter(bot => bot.willRespond(this.defaultSocialContext as string, message))
            .filter(bot => !this.isMessageFromBot(message, bot));
    }

    private async sendChatToMinecraftServer(botName : string, message : string) {
        const rcon = await Rcon.connect({
            host: this.typeSpecificConfig.rconHost,
            port: this.typeSpecificConfig.rconPort,
            password: this.typeSpecificConfig.rconPassword,
        });

        console.log("Sending message to Minecraft server: " + message)

        const messageWithBotName = `<${botName}> ${message}`;
        let escapedMessageWithBotName = JSON.stringify(messageWithBotName);
        let response = await rcon.send(`tellraw @a {"text":${escapedMessageWithBotName}, "color":"white"}`);

        console.log(".... sent message, got response: ", response);

        await rcon.end();

        // we need to do this because tellRaw doesn't write to server.log,
        // and we want the bot's responses to be included in the chat history for later calls
        await this.addLineToServerLog(messageWithBotName);
    }

    private async addLineToServerLog(line : string) {
        return fs.writeFile(this.typeSpecificConfig.serverLogPath, '[Bot server]: ' + line + '\n', { flag: 'a' });
    }

    /**
     * This is to prevent a bot from responding to its own messages
     */
    private isMessageFromBot(message: string, bot : Bot) {
        return message.indexOf(`<${bot.getName()}>`) >= 0;
    }

    async getServerLogHistory(): Promise<string[]> {
        const linesToKeep = new CappedArray<string>(this.maxChatHistoryLength);
        const buffer = await readLastLines(this.typeSpecificConfig.serverLogPath, this.typeSpecificConfig.serverLogLinesToRead);
        const content = buffer.toString('utf-8');
        content.split('\n').forEach(line => {
            const match = line.match(this.minecraftLogRegExp)
            if (match) {
                linesToKeep.add(match[1].trim() )
            }
        });
        // skip the last line, since that it is the current message being processed
        linesToKeep.removeLast();
        return linesToKeep.getAll();
    }
}



