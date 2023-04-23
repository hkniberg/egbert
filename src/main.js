require('dotenv').config(); // Initialize dotenv
const { maybeRespond } = require('./chat-logic'); // Import maybeRespond from chat-logic.js
const discordChatSource = require('./discord-chat-source');

require('axios');

discordChatSource.login(process.env.DISCORD_CLIENT_TOKEN).catch((error) => {
    console.error(`Error logging in to Discord: ${error}`);
});

// This is for testing in the console
const stdin = process.openStdin();
stdin.addListener('data', (message) => {
    maybeRespond(message.toString().trim(), 'Console user','Console', (response) => {
        console.log(response);
    });
});

const minecraft = require('./minecraft-chat-source');
minecraft.startWatchingLogFile(process.env.MINECRAFT_LOG_PATH, process.env.MINECRAFT_MEMORY_SERVER_NAME, process.env.MINECRAFT_RCON_HOST, process.env.MINECRAFT_RCON_PORT, process.env.MINECRAFT_RCON_PASSWORD);
