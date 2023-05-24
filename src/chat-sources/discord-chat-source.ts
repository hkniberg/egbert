import { ChatSource } from './chat-source';
import { Client, Events, GatewayIntentBits, Message, TextChannel } from 'discord.js';
import { splitStringAtNewline } from '../util/utils';
import { DiscordChatSourceConfig } from '../config';
import { Bot } from '../bot';

export class DiscordChatSource extends ChatSource {
    private readonly typeSpecificConfig: DiscordChatSourceConfig;
    private discordServerToSocialContextMap: Map<string, string> = new Map();
    private discordClient: Client;
    private ignoreMessagesFrom: string[] = [];

    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        typeSpecificConfig: DiscordChatSourceConfig,
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        this.discordClient = new Client({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
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

    addBot(bot: Bot) {
        // we don't want to respond to other bots, since that can lead to infinite chat loops
        this.ignoreMessagesFrom.push(bot.getName().toLowerCase());

        if (bot.getName() == this.typeSpecificConfig.bot) {
            super.addBot(bot);
        }
    }

    getSocialContexts(): string[] {
        if (this.defaultSocialContext) {
            return [this.defaultSocialContext, ...this.discordServerToSocialContextMap.values()];
        } else {
            return [...this.discordServerToSocialContextMap.values()];
        }
    }

    start(): void {
        // A discord chat source is directly associated with a single bot (since we connect to the discord API using a bot token).
        // That is set in the type-specific config. Here we verify that the bot was actually added to the chat source.
        const bot = this.bots.find((bot) => bot.getName() == this.typeSpecificConfig.bot);
        if (!bot) {
            throw new Error(`Bot '${this.typeSpecificConfig.bot}' not found for discord chat source ${this.name}`);
        }

        this.discordClient.login(this.typeSpecificConfig.botToken);

        this.discordClient.once(Events.ClientReady, (client) => {
            console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
        });

        this.discordClient.on(Events.MessageCreate, async (discordMessage: Message) => {
            const incomingMessage = discordMessage.content;
            console.log(
                `Discord chat source '${this.name}' received message from server '${discordMessage.guild?.name}':\n${incomingMessage}`,
            );

            const messageToSend = `${discordMessage.author.username}: ${incomingMessage}`;

            // check which discord server this message came from, and use the corresponding social context
            let socialContextToUse = this.defaultSocialContext;
            if (discordMessage.guild) {
                const configuredSocialContext = this.discordServerToSocialContextMap.get(discordMessage.guild.name);
                if (configuredSocialContext) {
                    socialContextToUse = configuredSocialContext;
                }
            }

            if (!socialContextToUse || socialContextToUse.trim().length == 0) {
                console.log(
                    `Received a message on discord server ${discordMessage.guild?.name} but no social context is configured for that server, and we have no default social context, so we will ignore the message.`,
                );
                return;
            }

            if (this.ignoreMessagesFrom.includes(discordMessage.author.username.toLowerCase())) {
                console.log(`Ignoring message because it is from '${discordMessage.author.username}'`);
                return;
            }

            if (!bot.willRespond(socialContextToUse, discordMessage.content)) {
                // early out so we don't waste time reading the chat history when we aren't going to respond anyway
                console.log(`${bot.getName()} does not want to respond to this message`);
                return;
            }

            let chatHistory = await this.loadDiscordChatHistory(discordMessage);
            const responseMessage = await bot.generateResponse(this.name, socialContextToUse, messageToSend, chatHistory);
            if (responseMessage) {
                // technically we could skip await and do these in parallel, but for now I'm choosing the path of least risk
                console.log(`[${this.name} ${socialContextToUse}] ${bot.getName()}: ${responseMessage}`);
                await sendDiscordResponse(discordMessage, responseMessage);
            }
        });
        console.log('Discord chat source started: ', this.name);
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
                .map((message) => `${message.author.username}: ${message.content}`)
                .reverse(); // discord responds with newest messages first, but we want oldest first
        } else {
            return [];
        }
    }
}

async function sendDiscordResponse(discordMessage: Message, responseMessage: string) {
    console.log(`Sending response to discord: ${responseMessage}`);
    const DISCORD_MESSAGE_MAX_LENGTH = 2000;
    const replyChunks = splitStringAtNewline(responseMessage, DISCORD_MESSAGE_MAX_LENGTH);
    for (let replyChunk of replyChunks) {
        if (replyChunk.length === 0) continue;
        await discordMessage.reply(replyChunk);
    }
}
