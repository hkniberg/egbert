require('dotenv').config(); // Initialize dotenv
const { Client, Events, GatewayIntentBits } = require('discord.js');
const { maybeRespond } = require('./chatLogic'); // Import maybeRespond from chatLogic.js


const discord = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const gptUrl = 'https://api.openai.com/v1/chat/completions';
const gptHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GPT_KEY}`,
};
const axios = require('axios');

discord.once(Events.ClientReady, (client) => {
    console.log(`Ready! Logged in as ${client.user.tag}. I see ${client.channels.cache.size} channels.`);
});

discord.on(Events.MessageCreate, (msg) => {
    const messageContent = msg.content;
    if (msg.author.username === 'Egbert') return; // Don't respond to yourself (or other bots)

    console.log(`Message created: ${messageContent}`);
    maybeRespond(messageContent, msg.author.username, (response) => {
        msg.reply(response);
    });
});

// Log in to Discord with your client's token
discord.login(process.env.CLIENT_TOKEN);

const stdin = process.openStdin();
stdin.addListener('data', (message) => {
    maybeRespond(message.toString().trim(), 'Console user', (response) => {
        console.log(response);
    });
});
