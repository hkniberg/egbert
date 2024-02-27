import { Client, Events, GatewayIntentBits, Message, TextChannel } from "discord.js";
import cron from "node-cron";
import { Bot } from "../bot";
import { DiscordChatSourceConfig } from "../config";
import { MediaGenerator, splitMessageByMedia } from "../media-generators/media-generator";
import { ChatMessage } from "../response-generators/response-generator";
import { splitStringAtNewline } from "../util/utils";
import { ChatSource } from "./chat-source";

export class DiscordChatSource extends ChatSource {
    private readonly typeSpecificConfig: DiscordChatSourceConfig;
    private discordServerToSocialContextMap: Map<string, string> = new Map();
    private discordClient: Client;
    private ignoreMessagesFrom: string[] = [];
    private mediaGenerators: MediaGenerator[];


    constructor(
        name: string,
        socialContextPrompts: Map<string, string>,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        crossReferencePattern: string | null,
        typeSpecificConfig: DiscordChatSourceConfig,
        mediaGenerators: MediaGenerator[]
    ) {
        super(name, socialContextPrompts, defaultSocialContext, maxChatHistoryLength, crossReferencePattern);
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
        console.log("Discord chat source created: ", this.name);
        this.mediaGenerators = mediaGenerators;
    }

    private schedulePrompts() {
        if (this.typeSpecificConfig.discordServers) {
            for (const discordServer of this.typeSpecificConfig.discordServers) {
                if (discordServer.scheduledPrompts) {
                    for (const scheduledPrompt of discordServer.scheduledPrompts) {
                        cron.schedule(scheduledPrompt.schedule, () => this.executeScheduledPrompt(discordServer.serverName, discordServer.socialContext, scheduledPrompt.prompt, scheduledPrompt.channel));
                    }
                }
            }
        }
    }

    private async executeScheduledPrompt(serverName: string, socialContext: string, prompt: string, channelName: string) {
        console.log(`Executing scheduled prompt for server '${serverName}', channel '${channelName}': ${prompt}`);
        const channelId = this.getChannelId(serverName, channelName);
        if (!channelId) {
            console.log(`Could not find channel ID for server '${serverName}' and channel '${channelName}', ignoring scheduled prompt`)
            return;
        }
        const channel = this.discordClient.channels.cache.get(channelId) as TextChannel;
        if (channel) {
            const bot = this.bots.find((bot) => bot.getName() == this.typeSpecificConfig.bot);
            if (bot) {
                const responseMessage = await bot.generateResponse(
                    this.name,
                    this.getSocialContextPrompt(socialContext),
                    socialContext,
                    bot.getName(),
                    prompt,
                    [],
                    () => { }
                );
                if (responseMessage) {
                    await this.sendDiscordMessage(channel, responseMessage);
                }
            }
        }
    }

    private getChannelId(serverName: string, channelName: string): string | null {
        const server = this.discordClient.guilds.cache.find(guild => guild.name === serverName);
        if (!server) {
            console.error(`Server '${serverName}' not found`);
            return null;
        }

        const channel = server.channels.cache.find(channel => channel.name === channelName && channel instanceof TextChannel);
        if (!channel) {
            console.error(`Channel '${channelName}' not found on server '${serverName}'`);
            return null;
        }

        return channel.id;
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
            this.schedulePrompts();
        });

        this.discordClient.on(Events.MessageCreate, async (discordMessage: Message) => {
            const triggerMessage = discordMessage.content;
            console.log(
                `Discord chat source '${this.name}' received message from server '${discordMessage.guild?.name}':\n${triggerMessage}`
            );

            let sender = discordMessage.author.username;

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
                    `Received a message on discord server ${discordMessage.guild?.name} but no social context is configured for that server, and we have no default social context, so we will ignore the message.`
                );
                return;
            }

            if (this.ignoreMessagesFrom.includes(sender.toLowerCase())) {
                console.log(`Ignoring message because it is from '${sender}'`);
                return;
            }

            if (!bot.willRespond(socialContextToUse, discordMessage.content)) {
                // early out so we don't waste time reading the chat history when we aren't going to respond anyway
                console.log(`${bot.getName()} does not want to respond to this message`);
                return;
            }

            let chatHistory = await this.loadDiscordChatHistory(discordMessage);
            let onMessageRemembered = () => {
                if (this.typeSpecificConfig.rememberEmoji) {
                    discordMessage.react(this.typeSpecificConfig.rememberEmoji);
                }
            };

            // Start typing indicator
            discordMessage.channel.sendTyping();

            const responseMessage = await bot.generateResponse(
                this.name,
                this.getSocialContextPrompt(socialContextToUse),
                socialContextToUse,
                sender,
                triggerMessage,
                chatHistory,
                onMessageRemembered
            );

            if (responseMessage) {
                // technically we could skip await and do these in parallel, but for now I'm choosing the path of least risk
                console.log(`[${this.name} ${socialContextToUse}] ${bot.getName()}: ${responseMessage}`);
                await this.sendDiscordResponse(discordMessage, responseMessage);
            }
        });
        console.log("Discord chat source started: ", this.name);
    }

    /**
     * loads previous messages from the same discord channel, up to and not including the given message.
     * Oldest messages first.
     */
    private async loadDiscordChatHistory(discordMessage: Message): Promise<ChatMessage[]> {
        if (this.maxChatHistoryLength === 0) {
            return [];
        }

        const channel = discordMessage.channel;
        if (channel instanceof TextChannel) {
            const options = {
                limit: this.maxChatHistoryLength,
                before: discordMessage.id,
            };
            const discordMessages = await channel.messages.fetch(options);
            return (
                Array.from(discordMessages.values())
                    // create a ChatMessage from each discord message
                    .map((discordMessage) => ({
                        sender: discordMessage.author.username ? discordMessage.author.username : null,
                        message: discordMessage.content,
                    }))
                    // reverse the array, since discord responds with newest messages first and we want oldest first
                    .reverse()
            );
        } else {
            return [];
        }
    }

    async sendDiscordResponse(discordMessage: Message, responseMessage: string) {
        console.log(`Sending response to discord: ${responseMessage}`);
        const channel = discordMessage.channel;
        if (channel instanceof TextChannel) {
            await this.sendDiscordMessage(channel, responseMessage);
        }
    }

    private async sendDiscordMessage(channel: TextChannel, message: string) {
        const DISCORD_MESSAGE_MAX_LENGTH = 2000;
        const segments = await splitMessageByMedia(this.mediaGenerators, message);
        for (let segment of segments) {
            if (segment && segment.startsWith("http")) {
                const embed = {
                    image: {
                        url: segment,
                    },
                };
                await channel.send({ embeds: [embed] });
            } else if (segment) {
                const replyChunks = splitStringAtNewline(segment, DISCORD_MESSAGE_MAX_LENGTH);
                for (let replyChunk of replyChunks) {
                    if (replyChunk.length === 0) continue;
                    await channel.send(replyChunk);
                }
            }
        }
    }
}
