import {ChatSource} from "./chat-source";
import {Client, Events, GatewayIntentBits, Message, TextChannel} from 'discord.js';
import {splitStringAtNewline} from "../utils";
import {DiscordChatSourceConfig} from "../config";
import {Bot} from "../bot";

export class DiscordChatSource extends ChatSource {
    private readonly typeSpecificConfig: DiscordChatSourceConfig;
    private discordServerToSocialContextMap: Map<string, string> = new Map();
    private discordClient : Client;

    constructor(name: string, defaultSocialContext: string | null, maxChatHistoryLength: number, typeSpecificConfig: DiscordChatSourceConfig) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.typeSpecificConfig = typeSpecificConfig;
        if (typeSpecificConfig.discordServers) {
            // loop through typeSpecificConfig.discordServers and add each server to the map
            for (const discordServer of typeSpecificConfig.discordServers) {
                this.discordServerToSocialContextMap.set(discordServer.serverName, discordServer.socialContext);
            }
        }
        console.log('Discord chat source created: ', this.name);
    }

    getSocialContexts() : string[] {
        if (this.defaultSocialContext) {
            return [this.defaultSocialContext, ...this.discordServerToSocialContextMap.values()];
        } else {
            return [...this.discordServerToSocialContextMap.values()];
        }
    }

    start(): void {
        this.discordClient.login(this.typeSpecificConfig.botToken);

        this.discordClient.once(Events.ClientReady, (client) => {
            console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
        });

        this.discordClient.on(Events.MessageCreate, async (discordMessage: Message) => {
            const incomingMessage = discordMessage.content;
            console.log(`Received message ${incomingMessage} from server ${discordMessage.guild?.name}`);

            const messageToSend = `${discordMessage.author.username}: ${incomingMessage}}`;

            // check which discord server this message came from, and use the corresponding social context
            let socialContextToUse = this.defaultSocialContext;
            if (discordMessage.guild) {
                const configuredSocialContext = this.discordServerToSocialContextMap.get(discordMessage.guild.name);
                if (configuredSocialContext) {
                    socialContextToUse = configuredSocialContext;
                }
            }

            if (!socialContextToUse || socialContextToUse.trim().length == 0) {
                console.log(`Received a message on discord server ${discordMessage.guild?.name} but no social context is configured for that server, and we have no default social context, so we will ignore the message.`);
                return;
            }

            const respondingBots : Bot[] = this.getRespondingBots(socialContextToUse, discordMessage)
            if (respondingBots.length === 0) {
                // early out so we don't waste time reading the chat history when we aren't going to respond anyway
                console.log("No bots want to respond to this message");
                return;
            }
            let chatHistory = await this.loadDiscordChatHistory(discordMessage);

            for (const bot of respondingBots) {
                const responseMessage = await bot.generateResponse(socialContextToUse, messageToSend, chatHistory);
                if (responseMessage) {
                    // technically we could skip await and do these in paralell, but for now I'm choosing the path of least risk
                    await sendDiscordResponse(discordMessage, responseMessage);
                }
            }
        });
        console.log('Discord chat source started: ', this.name);
    }

    private getRespondingBots(socialContext: string, discordMessage: Message) {
        return this.bots
            .filter(bot => bot.willRespond(socialContext, discordMessage.content))
            .filter(bot => !this.isMessageFromBot(discordMessage, bot));
    }

    /**
     * loads previous messages from the same discord channel, up to and not including the given message.
     * Oldest messages first.
     */
    private async loadDiscordChatHistory(discordMessage: Message) {
        if (this.maxChatHistoryLength === 0) {
            return [];
        }

        const channel = discordMessage.channel;
        if (channel instanceof TextChannel) {
            const options = {
                limit: this.maxChatHistoryLength,
                before: discordMessage.id,
            };
            const messages = await channel.messages.fetch(options);
            return Array.from(messages.values())
                .map(message => `${message.author.username}: ${message.content}`)
                .reverse(); // discord responds with newest messages first, but we want oldest first
        } else {
            return [];
        }
    }

    private isMessageFromBot(discordMessage: Message, bot: Bot) {
        return discordMessage.author.username.toLowerCase() === bot.getName().toLowerCase();
    }
}

async function sendDiscordResponse(discordMessage : Message, responseMessage: string) {
    console.log(`Sending response to discord: ${responseMessage}`);
    const DISCORD_MESSAGE_MAX_LENGTH = 2000;
    const replyChunks = splitStringAtNewline(responseMessage, DISCORD_MESSAGE_MAX_LENGTH);
    for (let replyChunk of replyChunks) {
        if (replyChunk.length === 0) continue;
        await discordMessage.reply(replyChunk);
    }
}


