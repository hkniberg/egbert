import { Bot } from "./bot";
import { createChatSources } from "./chat-sources/chat-source-factory";
import { DalleMediaGeneratorConfig, GenerateImageToolConfig, GetWeatherToolConfig, GiphyMediaGeneratorConfig, MediaGeneratorConfig, ToolConfig, parseConfig } from "./config";
import { DalleImageGenerator } from "./media-generators/dalle-image-generator";
import { GiphyGenerator } from "./media-generators/giphy-generator";
import { MediaGenerator } from "./media-generators/media-generator";
import { createMemoryManagers } from "./memory-managers/memory-manager-factory";
import { createResponseGenerators } from "./response-generators/response-generator-factory";
import { GenerateImage as GenerateImageTool } from "./tools/generate-image-tool";
import { GetWeatherTool } from "./tools/get-weather-tool";
import { Tool } from "./tools/tool";

const DEFAULT_CONFIG_PATH = "config/config.json5";

// load config from the file given in the command line, or DEFAULT_CONFIG_PATH if not given.
const configPath = process.argv[2] ? process.argv[2] : DEFAULT_CONFIG_PATH;
console.log("Loading config from " + configPath);
const config = parseConfig(configPath);

const mediaGenerators = createMediaGenerators(config.mediaGenerators);

const tools = createTools(config.tools);
const responseGenerators = createResponseGenerators(config.responseGenerators, tools);
const chatSources = createChatSources(config.chatSources, mediaGenerators);
const memoryManagers = createMemoryManagers(config.memoryManagers);

// Create each Bot and add to their respective chat sources (based on social context)
for (const botConfig of config.bots) {
    const responseGenerator = getResponseGeneratorByName(botConfig.responseGenerator);
    const memoryManager = getMemoryManagerByName(botConfig.memoryManager);

    const bot = new Bot(
        botConfig.name,
        botConfig.personality,
        memoryManager,
        botConfig.socialContexts,
        botConfig.triggers,
        responseGenerator
    );
    console.log(`Created bot '${bot.getName()}'`);
    for (const chatSource of chatSources.values()) {
        if (bot.isMemberOfAnySocialContext(chatSource.getSocialContexts())) {
            chatSource.addBot(bot);
            bot.addChatSource(chatSource);
            console.log(
                `  Added bot '${bot.getName()}' to chat source '${chatSource.getName()}', since they share at least one social context.`
            );
        }
    }
}

for (const chatSource of chatSources.values()) {
    console.log(`Starting chat source '${chatSource.getName()}'`);
    chatSource.start();
}

function createMediaGenerators(mediaGeneratorConfigs: Array<MediaGeneratorConfig> | null): MediaGenerator[] {
    if (!mediaGeneratorConfigs) {
        return [];
    }
    const mediaGenerators: MediaGenerator[] = [];
    for (const mediaGeneratorConfig of mediaGeneratorConfigs) {
        mediaGenerators.push(createMediaGenerator(mediaGeneratorConfig));
    }
    return mediaGenerators;
}

function createMediaGenerator(mediaGeneratorConfig: MediaGeneratorConfig): MediaGenerator {
    if (mediaGeneratorConfig.type === "giphy") {
        return new GiphyGenerator(mediaGeneratorConfig.typeSpecificConfig as GiphyMediaGeneratorConfig);
    } else if (mediaGeneratorConfig.type === "dalle") {
        return new DalleImageGenerator(mediaGeneratorConfig.typeSpecificConfig as DalleMediaGeneratorConfig);
    } else {
        throw "Unknown media generator type: " + mediaGeneratorConfig.type;
    }
}

function createTools(toolConfigs: Array<ToolConfig> | null): Array<Tool> {
    if (!toolConfigs) {
        return []
    }
    const tools: Tool[] = [];
    for (const toolConfig of toolConfigs) {
        tools.push(createTool(toolConfig));
    }
    return tools;
}

function createTool(toolConfig: ToolConfig): Tool {
    if (toolConfig.type === "generate-image") {
        return new GenerateImageTool(toolConfig.typeSpecificConfig as GenerateImageToolConfig);
    } else if (toolConfig.type === "get-weather") {
        return new GetWeatherTool(toolConfig.typeSpecificConfig as GetWeatherToolConfig);
    }
    throw "Unknown tool type: " + toolConfig.type;
}

function getResponseGeneratorByName(name: string) {
    const result = responseGenerators.get(name);
    if (result) {
        return result;
    }
    throw "No response generator found with name: " + name;
}

function getMemoryManagerByName(name: string | null) {
    if (!name) {
        return null;
    }

    const result = memoryManagers.get(name);
    if (result) {
        return result;
    }
    throw "No memory manager found with name: " + name;
}

console.log("The bot server is up and running!");
