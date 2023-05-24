import { ChatSource } from './chat-source';
import { MinecraftChatSourceConfig } from '../config';
import { Rcon } from 'rcon-client';
import { Tail } from 'tail';
import { Bot } from '../bot';
import { CappedArray } from '../util/capped-array';
import {ChatMessage} from "../response-generators/response-generator";

// regexp for the chat messages that should be visible to the bot. This can be set in the config.
// First group should be the username (optional), second group should be the message
// Here is an example of two log messages and how the regexp below matches them:
// [02May2023 14:44:27.936] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer/]: <MrHenrik> Hi there
//      => username is "MrHenrik", message is "Hi there"
// [02May2023 14:44:22.538] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer/]: MrHenrik bled out
//      => no username, message is "MrHenrik bled out"
const DEFAULT_FILTER = /(?:DedicatedServer\/]:\s|\[Bot server]:\s)(?:<(.+?)>)?(.*)/;

export class MinecraftChatSource extends ChatSource {
    private readonly typeSpecificConfig: MinecraftChatSourceConfig;
    private readonly filter = DEFAULT_FILTER;
    private readonly chatHistory: CappedArray<ChatMessage>;

    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        typeSpecificConfig: MinecraftChatSourceConfig,
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        if (!defaultSocialContext) {
            throw new Error('MinecraftChatSource must have a default social context');
        }
        this.typeSpecificConfig = typeSpecificConfig;
        this.chatHistory = new CappedArray<ChatMessage>(maxChatHistoryLength);
        console.log('Minecraft chat source created: ', this.name);

        // This regexp is used to filter the messages in the server log to only the ones we care about.
        // And also to strip out timestamp and other boilerplate.
        if (this.typeSpecificConfig.filter) {
            this.filter = new RegExp(this.typeSpecificConfig.filter);
        }
    }

    start(): void {
        const tail = new Tail(this.typeSpecificConfig.serverLogPath);
        tail.on('line', async (line) => {
            await this.processLine(line.toString());
        });

        tail.on('error', (error) => {
            console.error(`MinecraftChatSource Error: ${error}`);
        });

        console.log('Minecraft chat source started: ', this.typeSpecificConfig.serverLogPath);
    }

    async processLine(line: string) {
        const strmatch = line.match(this.filter);
        if (!strmatch) {
            // this is a log message that we don't care about
            return;
        }

        const sender = strmatch[1] ? strmatch[1].trim() : null;
        const triggerMessage = strmatch[2].trim();
        const senderString = sender ? `<${sender}> ` : '';
        console.log(`Got message from Minecraft server log: ${senderString} ${triggerMessage}`);

        const messagesToAddToChatHistory: ChatMessage[] = [{sender: sender, message: triggerMessage}];

        const respondingBots: Bot[] = this.getRespondingBots(triggerMessage);
        if (respondingBots.length === 0) {
            // early out so we don't waste time reading the chat history when we aren't going to respond anyway
            console.log('No bots want to respond to this message');
            // We will add this message to our chat history even if no bots respond
            // That way, when we talk to a bot it will be aware of the context of the conversation
            this.chatHistory.addAll(messagesToAddToChatHistory);
            return;
        }

        for (const bot of respondingBots) {
            const responseMessage = await bot.generateResponse(
                this.name,
                this.defaultSocialContext as string,
                sender,
                triggerMessage,
                this.chatHistory.getAll(),
            );
            if (responseMessage) {
                // technically we could skip await and do these in paralell, but for now I'm choosing the path of least risk
                const responseMessageWithBotName = `<${bot.getName()}> ${responseMessage}`;
                messagesToAddToChatHistory.push({sender: bot.getName(), message: responseMessage});
                await this.sendChatToMinecraftServer(responseMessageWithBotName);
            }
        }
        // We defer this to the end so that the chat history doesn't get updated while we are still generating responses
        this.chatHistory.addAll(messagesToAddToChatHistory);
    }

    private getRespondingBots(message: string) {
        return this.bots
            .filter((bot) => bot.willRespond(this.defaultSocialContext as string, message))
            .filter((bot) => !this.isMessageFromBot(message, bot));
    }

    private async sendChatToMinecraftServer(responseMessageWithBotName: string) {
        const rcon = await Rcon.connect({
            host: this.typeSpecificConfig.rconHost,
            port: this.typeSpecificConfig.rconPort,
            password: this.typeSpecificConfig.rconPassword,
        });

        console.log('Sending message to Minecraft server: ' + responseMessageWithBotName);

        let escapedMessageWithBotName = JSON.stringify(responseMessageWithBotName);
        let response = await rcon.send(`tellraw @a {"text":${escapedMessageWithBotName}, "color":"white"}`);

        console.log('.... sent message, got response: ', response);

        await rcon.end();
    }

    /**
     * This is to prevent a bot from responding to its own messages
     */
    private isMessageFromBot(message: string, bot: Bot) {
        return message.indexOf(`<${bot.getName()}>`) >= 0;
    }
}
