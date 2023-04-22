require('dotenv').config(); // Initialize dotenv
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { maybeRespond } = require('./chatLogic'); // Import maybeRespond from chatLogic.js
const { sendChatToMinecraftServer } = require('./minecraft');

const discord = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});
require('axios');
discord.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
});

discord.on(Events.MessageCreate, (msg) => {
    const messageContent = msg.content;
    if (msg.author.username === 'Egbert') return; // Don't respond to yourself (or other bots)

    console.log(`Message created: ${messageContent}`);
    maybeRespond(messageContent, msg.author.username, msg.guild.name, (response) => {
        const replyChunks = splitStringAtNewline(response, 2000);
        for (let replyChunk of replyChunks) {
            // ignore if the message is empty
            if (replyChunk.length === 0) continue;
            msg.reply(replyChunk);
        }
    });
});

// Log in to Discord with your client's token
discord.login(process.env.CLIENT_TOKEN);

// This is for testing in the console
const stdin = process.openStdin();
stdin.addListener('data', (message) => {
    maybeRespond(message.toString().trim(), 'Console user','Console', (response) => {
        console.log(response);
    });
});

function splitStringAtNewline(inputString, maxLength) {
    const lines = inputString.split('\n');
    let result = [];
    let currentLine = '';

    for (let line of lines) {
        if (currentLine.length + line.length + 1 <= maxLength) {
            // Add the line to the current chunk
            currentLine += (currentLine.length > 0 ? '\n' : '') + line;
        } else {
            // Save the current chunk
            result.push(currentLine);
            // Start a new chunk with the current line
            currentLine = line;
        }
    }

    // Add the last chunk if there is any
    if (currentLine.length > 0) {
        result.push(currentLine);
    }

    return result;
}

const Tail = require('tail').Tail;

const logFilePath = process.env.MINECRAFT_LOG;
const tail = new Tail(logFilePath);

const MINECRAFT_MEMORY_SERVER_NAME = process.env.MINECRAFT_MEMORY_SERVER_NAME

const rconHost = process.env.MINECRAFT_RCON_HOST;
const rconPort = process.env.MINECRAFT_RCON_PORT;
const rconPassword = process.env.MINECRAFT_RCON_PASSWORD;

tail.on('line', (line) => {
    maybeRespond(line.toString().trim(), 'UnknownMCPlayer',MINECRAFT_MEMORY_SERVER_NAME, (response) => {
        sendChatToMinecraftServer(response,host, port, password)
    });
});

tail.on('error', (error) => {
    console.error(`Error: ${error}`);
});