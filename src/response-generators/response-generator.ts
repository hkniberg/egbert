import {MemoryEntry} from "../memory-managers/memory-manager";

export interface ResponseGenerator {
    generateResponse(
        triggerMessage: string,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: string[],
    ): Promise<string>;
}
