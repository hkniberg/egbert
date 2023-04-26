import {ChatSource} from "./chat-source";
import {Client, Events, GatewayIntentBits, Message} from 'discord.js';
import {splitStringAtNewline} from "../utils";
import {DiscordChatSourceConfig} from "../config";

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

export class DiscordChatSource extends ChatSource {
    private readonly typeSpecificConfig: DiscordChatSourceConfig;

    constructor(name : string, socialContext : string, typeSpecificConfig: DiscordChatSourceConfig) {
        super(name, socialContext);
        this.typeSpecificConfig = typeSpecificConfig;
    }

    start(): void {
        discordClient.login(this.typeSpecificConfig.botToken);

        discordClient.once(Events.ClientReady, (client) => {
            console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
        });

        discordClient.on(Events.MessageCreate, async (discordMessage: Message) => {
            const incomingMessage = discordMessage.content;
            // send the message to each bot, and then each bot decides whether or not to respond
            // for example depending on if the message contains the bot's name.
            for (const bot of this.bots) {
                if (discordMessage.author.username === bot.getName()) return;

                const responseMessage = await bot.generateResponse(this.socialContext, incomingMessage);
                if (responseMessage) {
                    sendDiscordResponse(discordMessage, responseMessage);
                }
            }
        });
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