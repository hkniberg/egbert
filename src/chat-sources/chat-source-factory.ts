import {
    ChatSourceConfig,
    DiscordChatSourceConfig,
    MinecraftChatSourceConfig,
    TelegramChatSourceConfig,
    SlackChatSourceConfig,
} from '../config';
import { ChatSource } from './chat-source';
import { DiscordChatSource } from './discord-chat-source';
import { MinecraftChatSource } from './minecraft-chat-source';
import { TelegramChatSource } from './telegram-chat-source';
import { ConsoleChatSource } from './console-chat-source';
import { SlackChatSource } from './slack-chat-source';

function createChatSource(chatSourceConfig: ChatSourceConfig): ChatSource {
    if (chatSourceConfig.type === 'discord') {
        return new DiscordChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null, 
            chatSourceConfig.typeSpecificConfig as DiscordChatSourceConfig,
        );
    } else if (chatSourceConfig.type === 'minecraft') {
        return new MinecraftChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null, 
            chatSourceConfig.typeSpecificConfig as MinecraftChatSourceConfig,
        );
    } else if (chatSourceConfig.type === 'console') {
        return new ConsoleChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null, 
        );
    } else if (chatSourceConfig.type === 'telegram') {
        return new TelegramChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null, 
            chatSourceConfig.typeSpecificConfig as TelegramChatSourceConfig,
        );
    } else if (chatSourceConfig.type === 'slack') {
        return new SlackChatSource(
            chatSourceConfig.name,
            chatSourceConfig.defaultSocialContext ? chatSourceConfig.defaultSocialContext : null,
            chatSourceConfig.maxChatHistoryLength ? chatSourceConfig.maxChatHistoryLength : 0,
            chatSourceConfig.crossReferencePattern ? chatSourceConfig.crossReferencePattern : null, 
            chatSourceConfig.typeSpecificConfig as SlackChatSourceConfig,
        );
    } else {
        throw 'Unknown chat source type: ' + chatSourceConfig.type;
    }
}

export function createChatSources(chatSourceConfigs: Array<ChatSourceConfig>) {
    const chatSources: Map<String, ChatSource> = new Map();
    for (const chatSourceConfig of chatSourceConfigs) {
        chatSources.set(chatSourceConfig.name, createChatSource(chatSourceConfig));
    }
    return chatSources;
}
