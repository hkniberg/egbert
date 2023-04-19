require('dotenv').config(); //initialize dotenv
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ] });


// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
    console.log("Channels: " + c.channels.cache.size);
});

client.on('message', msg => {
    console.log("Message received: " + msg.content);
    if (msg.content === 'ping') {
        msg.reply('Pong!');
    }
});

client.on(Events.MessageCreate, msg => {
    console.log("Message created: " + msg.content);
    if (msg.content === 'ping') {
        msg.reply('Pong!');
    }
});


client.on(Events.InteractionCreate, async interaction => {
    console.log("Interaction create!");
});


// Log in to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);

