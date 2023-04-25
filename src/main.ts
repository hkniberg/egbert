require('dotenv').config();
const { maybeRespond } = require('./chat-logic');
const discordChatSource = require('./discord-chat-source');
const utils = require('./utils');
const minecraft = require('./minecraft-chat-source');
require('axios');

const defaultPersonality = utils.readRequiredConfigProperty('DEFAULT_PERSONALITY');

discordChatSource
    .login(process.env.DISCORD_CLIENT_TOKEN, defaultPersonality)
    .catch((error: any) => {
        console.error(`Error logging in to Discord: ${error}. Will ignore Discord.`);
    });

const stdin = process.openStdin();
stdin.addListener('data', async (message) => {
    const response = await maybeRespond(message.toString().trim(), 'Console user', 'Console', defaultPersonality);
    console.log(response);
});

minecraft.startWatchingLogFile(
    process.env.MINECRAFT_LOG_PATH,
    process.env.MINECRAFT_MEMORY_SERVER_NAME,
    process.env.MINECRAFT_RCON_HOST,
    process.env.MINECRAFT_RCON_PORT,
    process.env.MINECRAFT_RCON_PASSWORD,
    defaultPersonality
);

console.log("Egbert is up and running!");
