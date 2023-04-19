require('dotenv').config(); //initialize dotenv
const { Client, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] });

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}. I see ${c.channels.cache.size} channels.`);
});

client.on(Events.MessageCreate, msg => {
    const messageContent = msg.content;
    console.log("Message created: " + messageContent);
    maybeRespond(messageContent, msg.author.username, response => {
        msg.reply(response);
    });
});

function maybeRespond(message, author, callback) {
    if (message.toLowerCase() === 'hi egbert') {
        callback('Shutup ' + author);
    }
}


// Log in to Discord with your client's token
client.login(process.env.CLIENT_TOKEN);

const stdin = process.openStdin();
stdin.addListener("data", function(message) {
    maybeRespond(message.toString().trim(), "Console user", response => {
        console.log(response);
    });
});
