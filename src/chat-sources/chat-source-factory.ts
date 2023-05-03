import {ChatSourceConfig, DiscordChatSourceConfig, MinecraftChatSourceConfig} from "../config";
import {ChatSource} from "./chat-source";
import {DiscordChatSource} from "./discord-chat-source";
import {MinecraftChatSource} from "./minecraft-chat-source";
import {ConsoleChatSource} from "./console-chat-source";

export function createChatSource(chatSourceConfig: ChatSourceConfig): ChatSource {
    if (chatSourceConfig.type === "discord") {
        return new DiscordChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.typeSpecificConfig as DiscordChatSourceConfig
        );
    } else if (chatSourceConfig.type === "minecraft") {
        return new MinecraftChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.typeSpecificConfig as MinecraftChatSourceConfig
        );
    } else if (chatSourceConfig.type === "console") {
        return new ConsoleChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
        );
    } else {
        throw("Unknown chat source type: " + chatSourceConfig.type);
    }
}