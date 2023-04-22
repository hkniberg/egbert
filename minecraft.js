const { Rcon } = require('rcon-client');

async function sendChatToMinecraftServer(message, host, port, password) {
    const rcon = await Rcon.connect({
        host: host,
        port: port,
        password: password,
    });

    console.log("Sending message to Minecraft server...")

    let formattedMessage = `{"text":"[Egbert] ${message}", "color":"white"}`;
    let response = await rcon.send(`tellraw @a ${formattedMessage}`);
    console.log(".... sent message, got response: ", response);

    rcon.end();
}

module.exports = { sendChatToMinecraftServer };