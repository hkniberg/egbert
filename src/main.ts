import {parseConfig} from "./config";
import {Bot} from "./bot";
import {createChatSources} from "./chat-sources/chat-source-factory";
import {createResponseGenerators} from "./response-generators/response-generator-factory";

const DEFAULT_CONFIG_PATH = "config/config.json5";

// load config from the file given in the command line, or DEFAULT_CONFIG_PATH if not given.
const configPath = process.argv[2] ? process.argv[2] : DEFAULT_CONFIG_PATH;
console.log("Loading config from " + configPath)
const config = parseConfig(configPath);

const responseGenerators = createResponseGenerators(config.responseGenerators);
const chatSources = createChatSources(config.chatSources);

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
