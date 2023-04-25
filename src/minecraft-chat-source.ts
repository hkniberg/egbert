import {maybeRespond} from "./chat-logic";
import {Rcon} from "rcon-client";
import {Tail} from "tail";

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

export function startWatchingLogFile(logFilePath, serverName, rconHost, rconPort, rconPassword) {
    const regexPattern = /]:\s(.*)/;    // Clean line from log time stamps etc
    const regex = new RegExp(regexPattern);
    if (logFilePath != null && logFilePath.length > 0) {
        const tail = new Tail(logFilePath);
        tail.on('line', (line) => {
            const strmatch = line.toString().match(regex)
            if (strmatch != null) {                            
                maybeRespond(strmatch[1].trim(), '', serverName, (response) => {
                    sendChatToMinecraftServer(response, rconHost, rconPort, rconPassword)
                });
            }
        });

        tail.on('error', (error) => {
            console.error(`Error: ${error}`);
        });
    }
}

