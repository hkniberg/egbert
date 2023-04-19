require('dotenv').config(); //initialize dotenv
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] });


// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    console.log("Channels: " + c.channels.cache.size);
});

client.on(Events.MessageCreate, msg => {
    console.log("Message created: " + msg.content);
    if (msg.content.toLowerCase() === 'hi egbert') {
        msg.reply('Shutup ' + msg.author.username);
    }
});


client.on(Events.InteractionCreate, async interaction => {
    console.log("Interaction create!");
});


// Log in to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);

