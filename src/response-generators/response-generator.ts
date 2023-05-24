import {MemoryEntry} from "../memory-managers/memory-manager";


export interface ChatMessage {
    sender: string | null,
    message: string
}

export interface ResponseGenerator {
    generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[],
    ): Promise<string>;
}
