import {ChatSource} from "./chat-source";
import {MinecraftChatSourceConfig} from "../config";
import {Rcon} from "rcon-client";
import {Tail} from "tail";

export class MinecraftChatSource extends ChatSource {
    private readonly typeSpecificConfig: MinecraftChatSourceConfig;

    constructor(name : string, defaultSocialContext : string | null, typeSpecificConfig: MinecraftChatSourceConfig) {
        super(name, defaultSocialContext);
        if (!defaultSocialContext) {
            throw new Error("MinecraftChatSource must have a default social context");
        }
        this.typeSpecificConfig = typeSpecificConfig;
    }

    start(): void {
        const regexPattern = /]:\s(.*)/;    // Clean line from log time stamps etc
        const regex = new RegExp(regexPattern);

        const tail = new Tail(this.typeSpecificConfig.serverLogPath);
        tail.on('line', async (line) => {
            const strmatch = line.toString().match(regex)
            if (strmatch != null) {
                const messageToSendToBot = strmatch[1].trim()
                for (const bot of this.bots) {
                    const responseMessage = await bot.generateResponse(this.defaultSocialContext as string, messageToSendToBot);
                    if (responseMessage) {
                        this.sendChatToMinecraftServer(bot.getName(), responseMessage);
                    }
                }
            }
        });

        tail.on('error', (error) => {
            console.error(`Error: ${error}`);
        });
    }

    async sendChatToMinecraftServer(botName : string, message : string) {
        const rcon = await Rcon.connect({
            host: this.typeSpecificConfig.rconHost,
            port: this.typeSpecificConfig.rconPort,
            password: this.typeSpecificConfig.rconPassword,
        });

        console.log("Sending message to Minecraft server: " + message)

        let escapedMessage = JSON.stringify(`[${botName}] ${message}`);
        let response = await rcon.send(`tellraw @a {"text":${escapedMessage}, "color":"white"}`);

        console.log(".... sent message, got response: ", response);

        await rcon.end();
    }
}


