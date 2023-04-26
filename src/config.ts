import * as fs from 'fs';
const JSON5 = require('json5')

export interface Config {
    memoriesFolder: string;
    bots: Array<BotConfig>;
    responseGenerators: Array<ResponseGeneratorConfig>;
    chatSources: Array<ChatSourceConfig>;
}

export interface BotConfig {
    name: string;
    responseGenerator: string;
    personality: string;
    socialContexts: Array<string>;
}

export interface OpenAiResponseGeneratorConfig {
    apiKey: string;
    model: string;
    temperature: number;
}

export interface ResponseGeneratorConfig {
    name: string;
    type: string;
    typeSpecificConfig?: OpenAiResponseGeneratorConfig; // add other response generator configs here if we create more
}

export interface ChatSourceConfig {
    name: string; // TODO discuss if we really need this, since we never reference it
    type: string;
    socialContext: string;
    typeSpecificConfig?: DiscordChatSourceConfig | MinecraftChatSourceConfig;
}

export interface DiscordChatSourceConfig {
    botToken: string;
}

export interface MinecraftChatSourceConfig {
    rconHost: string;
    rconPort: number;
    rconPassword: string;
    serverLogPath: string;
}

export function parseConfig(path: string): Config {
    const configJson = fs.readFileSync(path, 'utf-8');
    return JSON5.parse(configJson);
}


