import * as fs from 'fs';
const JSON5 = require('json5');
const path = require('path');

export interface Config {
    bots: Array<BotConfig>;
    memoryManagers: Array<MemoryManagerConfig> | null;
    responseGenerators: Array<ResponseGeneratorConfig>;
    chatSources: Array<ChatSourceConfig>;
}

export interface BotConfig {
    name: string;
    responseGenerator: string;
    memoryManager: string | null;
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
    typeSpecificConfig?: DiscordChatSourceConfig | MinecraftChatSourceConfig | TelegramChatSourceConfig;
    crossReferencePattern?: string;
}

export interface DiscordChatSourceConfig {
    botToken: string;
    bot: string;
    rememberEmoji?: string;
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
    filter?: string;
}

export interface TelegramChatSourceConfig {
    botToken: string;
}

export interface SlackChatSourceConfig {
    bot: string;
    botToken: string;
    signingSecret: string;
    appToken: string;
    userNameCacheSeconds?: number; // how often to refresh the cache of user names (we need to look up user names by id)
    rememberEmoji?: string;
    thread?: boolean; // true (default) if we should create a new thread when responding to a non-threaded message
}

export interface MemoryManagerConfig {
    name: string;
    type: string;
    typeSpecificConfig?: KeywordTriggeredMemoryManagerConfig | WeaviateMemoryManagerConfig;
}

export interface KeywordTriggeredMemoryManagerConfig {
    memoriesFolder: string;
    pattern: string;
}

export interface WeaviateMemoryManagerConfig {
    scheme: string;
    host: string;
    openAiKey: string;
    limit: number;
    groupingForce: number;
    rememberModel?: string;
    // the three params below (optional) are best understood by looking at the default constants in weaviate-memory-manager.ts
    rememberInstructions?: string;
    rememberExamples?: string[];
    dontRememberExamples?: string[];
}

// Recursively load a json5 config file with the include directive
export function parseConfig(configFilePath: string): Config {
    const resolvedConfigFilePath = path.resolve(process.cwd(), configFilePath);
    const configJson = fs.readFileSync(resolvedConfigFilePath, 'utf-8');
    const config = JSON5.parse(configJson);

    if (config.include) {
        if (Array.isArray(config.include)) {
            config.include.forEach((subPath: string) => {
                const subConfig = parseConfig(subPath);
                Object.assign(config, subConfig);
            });
        } else {
            const subConfig = parseConfig(config.include);
            Object.assign(config, subConfig);
        }
        delete config.include;
    }

    return config;
}
