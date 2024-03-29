import {
    ChatSourceConfig,
    DiscordChatSourceConfig,
    MinecraftChatSourceConfig,
    SlackChatSourceConfig,
    TelegramChatSourceConfig,
} from "../config";
import { MediaGenerator } from "../media-generators/media-generator";
import { ChatSource } from "./chat-source";
import { ConsoleChatSource } from "./console-chat-source";
import { DiscordChatSource } from "./discord-chat-source";
import { MinecraftChatSource } from "./minecraft-chat-source";
import { SlackChatSource } from "./slack-chat-source";
import { TelegramChatSource } from "./telegram-chat-source";

function createChatSource(chatSourceConfig: ChatSourceConfig, mediaGenerators: MediaGenerator[], socialContextsPrompts: Map<string, string>): ChatSource {
    if (chatSourceConfig.type === "discord") {
        return new DiscordChatSource(
            chatSourceConfig.name,
            socialContextsPrompts,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null,
            chatSourceConfig.typeSpecificConfig as DiscordChatSourceConfig,
            mediaGenerators
        );
    } else if (chatSourceConfig.type === "minecraft") {
        return new MinecraftChatSource(
            chatSourceConfig.name,
            socialContextsPrompts,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null,
            chatSourceConfig.typeSpecificConfig as MinecraftChatSourceConfig
        );
    } else if (chatSourceConfig.type === "console") {
        return new ConsoleChatSource(
            chatSourceConfig.name,
            socialContextsPrompts,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null,

        );
    } else if (chatSourceConfig.type === "telegram") {
        return new TelegramChatSource(
            chatSourceConfig.name,
            socialContextsPrompts,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null,
            chatSourceConfig.typeSpecificConfig as TelegramChatSourceConfig
        );
    } else if (chatSourceConfig.type === "slack") {
        return new SlackChatSource(
            chatSourceConfig.name,
            socialContextsPrompts,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null,
            chatSourceConfig.typeSpecificConfig as SlackChatSourceConfig
        );
    } else {
        throw "Unknown chat source type: " + chatSourceConfig.type;
    }
}

export function createChatSources(chatSourceConfigs: Array<ChatSourceConfig>, mediaGenerators: MediaGenerator[], socialContextsPrompts: Map<string, string>) {
    const chatSources: Map<string, ChatSource> = new Map();
    for (const chatSourceConfig of chatSourceConfigs) {
        chatSources.set(chatSourceConfig.name, createChatSource(chatSourceConfig, mediaGenerators, socialContextsPrompts));
    }
    return chatSources;
}
