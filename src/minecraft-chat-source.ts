import {maybeRespond} from "./chat-logic";
import {Rcon} from "rcon-client";
import {Tail} from "tail";

async function sendChatToMinecraftServer(message : string, host : string, port : number, password : string) {
    const rcon = await Rcon.connect({
        host: host,
        port: port,
        password: password,
    });

    console.log("Sending message to Minecraft server: " + message)

    let escapedMessage = JSON.stringify(`[Egbert] ${message}`);
    let response = await rcon.send(`tellraw @a {"text":${escapedMessage}, "color":"white"}`);

    console.log(".... sent message, got response: ", response);

    await rcon.end();
}

export function startWatchingLogFile(logFilePath : string, serverName : string, rconHost : string, rconPort : number, rconPassword : string, defaultPersonality : string) {
    const regexPattern = /]:\s(.*)/;    // Clean line from log time stamps etc
    const regex = new RegExp(regexPattern);
    if (logFilePath != null && logFilePath.length > 0) {
        const tail = new Tail(logFilePath);
        tail.on('line', async (line) => {
            const strmatch = line.toString().match(regex)
            if (strmatch != null) {                            
                const response = await maybeRespond(strmatch[1].trim(), '', serverName, defaultPersonality)
                if (response) {
                    await sendChatToMinecraftServer(response, rconHost, rconPort, rconPassword)
                }
            }
        });

        tail.on('error', (error) => {
            console.error(`Error: ${error}`);
        });
    }
}

