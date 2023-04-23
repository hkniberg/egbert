const { Rcon } = require('rcon-client');
const Tail = require('tail').Tail;
const { maybeRespond } = require('./chat-logic');

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

function startWatchingLogFile(logFilePath, serverName, rconHost, rconPort, rconPassword) {
    if (logFilePath != null && logFilePath.length > 0) {
        const tail = new Tail(logFilePath);
        tail.on('line', (line) => {
            maybeRespond(line.toString().trim(), '', serverName, (response) => {
                sendChatToMinecraftServer(response, rconHost, rconPort, rconPassword)
            });
        });

        tail.on('error', (error) => {
            console.error(`Error: ${error}`);
        });
    }
}

module.exports = { sendChatToMinecraftServer, startWatchingLogFile };
