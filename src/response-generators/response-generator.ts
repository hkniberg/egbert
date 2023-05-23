import {MemoryEntry} from "../memory-managers/memory-manager";

export interface ResponseGenerator {
    generateResponse(
        userPrompt: string,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: string[],
    ): Promise<string>;
}
