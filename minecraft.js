const { Rcon } = require('rcon-client');

async function sendChatToMinecraftServer(message, host, port, password) {
    const rcon = await Rcon.connect({
        host: host,
        port: port,
        password: password,
    });

    console.log("Sending message to Minecraft server: " + message)

    let escapedMessage = JSON.stringify(`[Egbert] ${message}`);
    let response = await rcon.send(`tellraw @a {"text":${escapedMessage}, "color":"white"}`);

    console.log(".... sent message, got response: ", response);

    rcon.end();
}

module.exports = { sendChatToMinecraftServer };