import * as fs from 'fs';
const JSON5 = require('json5');
const path = require('path');

export interface Config {
    memoriesFolder?: string;
    bots: Array<BotConfig>;
    responseGenerators: Array<ResponseGeneratorConfig>;
    chatSources: Array<ChatSourceConfig>;
}

export interface BotConfig {
    name: string;
    responseGenerator: string;
    personality: string;
    socialContexts: Array<string>;
    triggers: Array<BotTriggerConfig>;
}

export interface BotTriggerConfig {
    pattern: string;
    socialContext?: string;
    probability?: number;
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
    name: string; // only needed for logging
    type: string;
    defaultSocialContext?: string;
    maxChatHistoryLength?: number;
    typeSpecificConfig?: DiscordChatSourceConfig | MinecraftChatSourceConfig;
}

export interface DiscordChatSourceConfig {
    botToken: string;
    discordServers?: Array<DiscordServerConfig>;
}

export interface DiscordServerConfig {
    serverName: string;
    socialContext: string;
}

export interface MinecraftChatSourceConfig {
    rconHost: string;
    rconPort: number;
    rconPassword: string;
    serverLogPath: string;
    filter: string;
}

export interface TelegramChatSourceConfig {
    botToken: string;
}

export function parseConfig(configFilePath: string): Config {
    const configFilePathRelativeToCurrentWorkingDir = path.resolve(process.cwd(), configFilePath);
    const configJson = fs.readFileSync(configFilePathRelativeToCurrentWorkingDir, 'utf-8');
    return JSON5.parse(configJson);
}
