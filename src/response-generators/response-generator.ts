import { MemoryEntry } from "../memory-managers/memory-manager";

export interface ChatMessage {
    sender: string | null;
    message: string;
}

export interface ChatSourceHistory {
    chatSource: string;
    chatHistory: ChatMessage[];
}

export interface ResponseGenerator {
    generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        botPrompt: string,
        chatSourcePrompt: string | null,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[],
        otherChatSourceHistories: ChatSourceHistory[]
    ): Promise<string>;
}
