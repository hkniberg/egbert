require('dotenv').config(); // Initialize dotenv
const { maybeRespond } = require('./chat-logic'); // Import maybeRespond from chat-logic.js
const { sendChatToMinecraftServer } = require('./minecraft');
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

const Tail = require('tail').Tail;

const logFilePath = process.env.MINECRAFT_LOG_PATH;

const MINECRAFT_MEMORY_SERVER_NAME = process.env.MINECRAFT_MEMORY_SERVER_NAME

const rconHost = process.env.MINECRAFT_RCON_HOST;
const rconPort = process.env.MINECRAFT_RCON_PORT;
const rconPassword = process.env.MINECRAFT_RCON_PASSWORD;

if (logFilePath != null && logFilePath.length > 0) {
    const tail = new Tail(logFilePath);
    tail.on('line', (line) => {
        maybeRespond(line.toString().trim(), '',MINECRAFT_MEMORY_SERVER_NAME, (response) => {
            sendChatToMinecraftServer(response, rconHost, rconPort, rconPassword)
        });
    });

    tail.on('error', (error) => {
        console.error(`Error: ${error}`);
    });
}

