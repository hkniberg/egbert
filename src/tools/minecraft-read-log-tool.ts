import * as fs from 'fs';
import { DEFAULT_FILTER } from '../chat-sources/minecraft-chat-source';
import { MinecraftReadLogToolConfig } from '../config';
import { Tool } from "./tool";

export class MinecraftReadLogTool implements Tool {
    public static readonly TOOL_NAME = "minecraft-read-log";
    private config: MinecraftReadLogToolConfig;

    constructor(config: MinecraftReadLogToolConfig) {
        this.config = config;
    }

    async use(
        sendStatusToClient: (activity: string) => void,
    ): Promise<string[]> {
        const logData = fs.readFileSync(this.config.serverLogPath, 'utf-8');
        const logLines = logData.split('\n').reverse().slice(0, this.config.lines);
        const filter = this.config.filter ? new RegExp(this.config.filter) : DEFAULT_FILTER;

        const filteredLines = logLines.filter(line => filter.test(line));
        sendStatusToClient(`Retrieved ${filteredLines.length} log lines...`);
        return filteredLines;
    }

    definition = {
        name: MinecraftReadLogTool.TOOL_NAME,
        description: "Checks the latest lines of the Minecraft server log to see what is happening on the server.",
        parameters: {
            type: "object",
            properties: {
            },
            required: [],
        },
    };
}