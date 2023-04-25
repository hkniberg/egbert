import { Client, Events, GatewayIntentBits } from 'discord.js';
import {maybeRespond} from "./chat-logic";

import {splitStringAtNewline} from "./utils";

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

discordClient.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
});

discordClient.on(Events.MessageCreate, (msg) => {
    const messageContent = msg.content;
    if (msg.author.username === 'Egbert') return;

    console.log(`Message created: ${messageContent}`);
    maybeRespond(messageContent, msg.author.username, msg.guild.name, (response) => {
        const replyChunks = splitStringAtNewline(response, 2000);
        for (let replyChunk of replyChunks) {
            if (replyChunk.length === 0) continue;
            msg.reply(replyChunk);
        }
    });
});

export function login(token) {
    return discordClient.login(token);
}
