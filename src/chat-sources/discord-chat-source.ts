import {ChatSource} from "./chat-source";
import {Client, Events, GatewayIntentBits, Message} from 'discord.js';
import {splitStringAtNewline} from "../utils";
import {DiscordChatSourceConfig} from "../config";

export class DiscordChatSource extends ChatSource {
    private readonly typeSpecificConfig: DiscordChatSourceConfig;
    private discordServerToSocialContextMap: Map<string, string> = new Map();
    private discordClient : Client;

    constructor(name : string, defaultSocialContext : string | null, typeSpecificConfig: DiscordChatSourceConfig) {
        super(name, defaultSocialContext);
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

            // send the message to each bot, and then each bot decides whether or not to respond
            // for example depending on if the message contains the bot's name.
            for (const bot of this.bots) {
                if (discordMessage.author.username.toLowerCase() === bot.getName().toLowerCase()) continue;

                if (!bot.isMemberOfSocialContext(socialContextToUse)) continue;

                const responseMessage = await bot.generateResponse(socialContextToUse, incomingMessage);
                if (responseMessage) {
                    sendDiscordResponse(discordMessage, responseMessage);
                }
            }
        });
        console.log('Discord chat source started: ', this.name);
    }
}


async function sendDiscordResponse(discordMessage : Message, responseMessage: string) {
    const DISCORD_MESSAGE_MAX_LENGTH = 2000;
    const replyChunks = splitStringAtNewline(responseMessage, DISCORD_MESSAGE_MAX_LENGTH);
    for (let replyChunk of replyChunks) {
        if (replyChunk.length === 0) continue;
        await discordMessage.reply(replyChunk);
    }
}