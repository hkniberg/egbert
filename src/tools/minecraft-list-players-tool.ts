import { Rcon } from 'rcon-client';
import { MinecraftListPlayersToolConfig } from '../config';
import { Tool } from "./tool";

export class MinecraftListPlayersTool implements Tool {
    public static readonly TOOL_NAME = "minecraft-list-players";
    private config: MinecraftListPlayersToolConfig;

    constructor(config: MinecraftListPlayersToolConfig) {
        this.config = config;
    }

    async use(
        sendStatusToClient: (activity: string) => void,
    ): Promise<string> {
        const rcon = await Rcon.connect({ host: this.config.rconHost, port: this.config.rconPort, password: this.config.rconPassword });
        sendStatusToClient("Connected to Minecraft server...");
        const response = await rcon.send("/list");
        await rcon.end();
        return response;
    }

    definition = {
        name: MinecraftListPlayersTool.TOOL_NAME,
        description: "Lists the players currently online on the Minecraft server",
        parameters: {
            type: "object",
            properties: {
            },
            required: [],
        },
    };
}