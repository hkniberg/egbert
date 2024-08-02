import * as fs from "fs";
import JSON5 from "json5";
import path from "path";
import { ModelType } from "./api/gpt";

// Make most of these optional
export interface Config {
    bots: Array<BotConfig>;
    socialContexts: Array<SocialContextConfig>;
    memoryManagers: Array<MemoryManagerConfig> | null;
    responseGenerators: Array<ResponseGeneratorConfig>;
    chatSources: Array<ChatSourceConfig>;
    mediaGenerators: Array<MediaGeneratorConfig> | null;
    tools: Array<ToolConfig> | null;
}

export interface BotConfig {
    name: string;
    responseGenerator: string;
    memoryManager: string | null;
    personality: string;
    socialContexts: Array<string>;
    triggers: Array<BotTriggerConfig>;
}

export interface SocialContextConfig {
    name: string;
    prompt: string;
}

export interface ToolConfig {
    name: string;
    type: string;
    typeSpecificConfig?: GenerateImageToolConfig | GetWeatherToolConfig | MinecraftListPlayersToolConfig | MinecraftReadLogToolConfig;
}

export interface GenerateImageToolConfig {
    apiKey: string;
}

export interface GetWeatherToolConfig {
    apiKey: string;
    cacheTimeSeconds: number;
}

export interface MinecraftListPlayersToolConfig {
    rconHost: string;
    rconPort: number;
    rconPassword: string;
}

export interface MinecraftReadLogToolConfig {
    serverLogPath: string;
    lines: number;
    filter?: string;
}

export interface MediaGeneratorConfig {
    type: string;
    typeSpecificConfig?: GiphyMediaGeneratorConfig | DalleMediaGeneratorConfig; // add other response generator configs here if we create more
}

export interface GiphyMediaGeneratorConfig {
    apiKey: string;
}

export interface DalleMediaGeneratorConfig {
    awsAccessKeyId: string;
    awsSecretAccessKey: string;
    awsRegion: string;
    awsBucketName: string;
    apiKey: string;
}

export interface BotTriggerConfig {
    pattern: string;
    socialContext?: string;
    probability?: number;
}

export interface OpenAiResponseGeneratorConfig {
    apiKey: string;
    model: ModelType;
    temperature: number;
    apiBaseUrl?: string; // Defaults to https://api.openai.com/v1
}

export interface OllamaResponseGeneratorConfig {
    model: string;
    temperature: number;
    apiBaseUrl?: string; // Defaults to http://localhost:11434/api
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
    scheduledPrompts?: Array<ScheduledPromptConfig>;
}

export interface ScheduledPromptConfig {
    prompt: string;
    schedule: string;
    channel: string;
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
    const configJson = fs.readFileSync(resolvedConfigFilePath, "utf-8");
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