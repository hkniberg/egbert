require('dotenv').config({path: "../.env"}); // Initialize dotenv
const { maybeRespond } = require('./chat-logic'); // Import maybeRespond from chat-logic.ts
const discordChatSource = require('./discord-chat-source');
const utils = require('./utils');
const defaultPersonality = utils.readRequiredConfigProperty('DEFAULT_PERSONALITY');

require('axios');

discordChatSource.login(process.env.DISCORD_CLIENT_TOKEN, defaultPersonality).catch((error : unknown) => {
    console.error(`Error logging in to Discord: ${error}. Will ignore Discord.`);
});

// This is for testing in the console
const stdin = process.openStdin();
stdin.addListener('data', async(message) => {
    const response = await maybeRespond(message.toString().trim(), 'Console user','Console', defaultPersonality);
    console.log(response);
});

const minecraft = require('./minecraft-chat-source');
minecraft.startWatchingLogFile(process.env.MINECRAFT_LOG_PATH,
    process.env.MINECRAFT_MEMORY_SERVER_NAME, process.env.MINECRAFT_RCON_HOST, process.env.MINECRAFT_RCON_PORT, process.env.MINECRAFT_RCON_PASSWORD,
    defaultPersonality
);
