require('dotenv').config(); //initialize dotenv
const { Client, Events, GatewayIntentBits } = require('discord.js');

const temperature = 0.7;

const discord = new Client({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] });

const gptUrl = 'https://api.openai.com/v1/chat/completions';
const gptHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.GPT_KEY,
};
const axios = require('axios');

discord.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}. I see ${c.channels.cache.size} channels.`);
});

discord.on(Events.MessageCreate, msg => {
    const messageContent = msg.content;
    if (msg.author.username === 'Egbert') return; // don't respond to yourself (or other bots)

    console.log("Message created: " + messageContent);
    maybeRespond(messageContent, msg.author.username, response => {
        msg.reply(response);
    });
});

function maybeRespond(message, author, callback) {
    const messageContainsEgbert = message.toLowerCase().includes("egbert");
    if (messageContainsEgbert) {
        gptChat([
                {role: 'system', content: 'You are Egbert, a very funny and sarcastic and slightly grumpy chatbot who never gives a straight answer. You live inside a discord server and resent that. If anyone mentions flowers you instantly become romantic and flirty instead, and start reciting poetry and quotes from philosophers.'},
                {role: 'user', content: author + ': ' + message}
            ]
        , callback);
    }
}

/*
    @param messages: array of objects with role and content. Role should be 'system' or 'user' or 'assistant'.
 */
async function gptChat(messages, callback) {
    try {
        const body = {
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: temperature,
        };

        const response = await axios.post(gptUrl, body, { headers: gptHeaders });
        callback(response.data.choices[0].message.content);
    } catch (error) {
        console.error(error);
    }
}


// Log in to Discord with your client's token
discord.login(process.env.CLIENT_TOKEN);

const stdin = process.openStdin();
stdin.addListener("data", function(message) {
    maybeRespond(message.toString().trim(), "Console user", response => {
        console.log(response);
    });
});
