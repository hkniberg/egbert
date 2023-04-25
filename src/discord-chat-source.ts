import {Client, Events, GatewayIntentBits, Message} from 'discord.js';
import {maybeRespond} from "./chat-logic";

import {splitStringAtNewline} from "./utils";

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// very ugly approach....
let _defaultPersonality : string;

discordClient.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
});

discordClient.on(Events.MessageCreate, async (msg: Message) => {
    const messageContent = msg.content;
    if (msg.author.username === 'Egbert') return;

    console.log(`Message created: ${messageContent}`);

    const serverName = msg.guild?.name || 'unknown';

    const response = await maybeRespond(messageContent, msg.author.username, serverName, _defaultPersonality);
    const DISCORD_MESSAGE_MAX_LENGTH = 2000;
    if (response) {
        const replyChunks = splitStringAtNewline(response, DISCORD_MESSAGE_MAX_LENGTH);
        for (let replyChunk of replyChunks) {
            if (replyChunk.length === 0) continue;
            await msg.reply(replyChunk);
        }
    }
});

export function login(token : string, defaultPersonality : string) {
    _defaultPersonality = defaultPersonality;
    return discordClient.login(token);
}
