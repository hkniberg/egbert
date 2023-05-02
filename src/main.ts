import {DiscordChatSourceConfig, MinecraftChatSourceConfig, OpenAiResponseGeneratorConfig} from "./config";
import {parseConfig} from "./config";
import {ChatSource} from "./chat-sources/chat-source";
import {DiscordChatSource} from "./chat-sources/discord-chat-source";
import {MinecraftChatSource} from "./chat-sources/minecraft-chat-source";
import {ConsoleChatSource} from "./chat-sources/console-chat-source";
import {ResponseGenerator} from "./response-generators/response-generator";
import {OpenAiResponseGenerator} from "./response-generators/openai-response-generator";
import {EchoResponseGenerator} from "./response-generators/echo-response-generator";
import {Bot} from "./bot";

require('dotenv').config();

const CONFIG_PATH = "config/config.json5";
const config = parseConfig(CONFIG_PATH);
console.log(`Loaded config from ${CONFIG_PATH}`);

// Create all ResponseGenerators
const responseGenerators: Map<string, ResponseGenerator> = new Map();
for (const responseGeneratorConfig of config.responseGenerators) {
    let responseGenerator: ResponseGenerator;
    if (responseGeneratorConfig.type === "openai") {
        responseGenerator = new OpenAiResponseGenerator(responseGeneratorConfig.typeSpecificConfig as OpenAiResponseGeneratorConfig);
    } else if (responseGeneratorConfig.type === "echo") {
        responseGenerator = new EchoResponseGenerator();
    } else {
        throw("Unknown response generator type: " + responseGeneratorConfig.type);
    }
    responseGenerators.set(responseGeneratorConfig.name, responseGenerator);
}

// Create all ChatSources
const chatSources: Array<ChatSource> = [];
for (const chatSourceConfig of config.chatSources) {
    let chatSource: ChatSource;
    if (chatSourceConfig.type === "discord") {
        chatSource = new DiscordChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.typeSpecificConfig as DiscordChatSourceConfig
        );
    } else if (chatSourceConfig.type === "minecraft") {
        chatSource = new MinecraftChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.typeSpecificConfig as MinecraftChatSourceConfig
        );
    } else if (chatSourceConfig.type === "console") {
        chatSource = new ConsoleChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
        );
    } else {
        throw("Unknown chat source type: " + chatSourceConfig.type);
    }
    chatSources.push(chatSource);
}

// Create each Bot and add to their respective chat sources (based on social context)
for (const botConfig of config.bots) {
    const responseGenerator = getResponseGeneratorByName(botConfig.responseGenerator);
    const bot = new Bot(botConfig.name, botConfig.personality, config.memoriesFolder, botConfig.socialContexts, responseGenerator);
    console.log(`Created bot ${bot.getName()}`);
    for (const chatSource of chatSources.values()) {
        if (bot.isMemberOfAnySocialContext(chatSource.getSocialContexts())) {
            chatSource.addBot(bot);
            console.log(`  Added bot ${bot.getName()} to chat source ${chatSource.getName()}, since both are members of social context ${chatSource.getDefaultSocialContext()}`);
        }
    }
}

for (const chatSource of chatSources.values()) {
    chatSource.start();
}

function getResponseGeneratorByName(name: string) {
    const result = responseGenerators.get(name);
    if (result) {
        return result;
    }
    throw("No response generator found with name: " + name);
}

console.log("The bot server is up and running!");
