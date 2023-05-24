import {ChatMessage} from "../response-generators/response-generator";

export interface MemoryEntry {
    date?: Date,
    bot: string,
    chatSource: string,
    socialContext: string,
    sender?: string,
    trigger: string,
    response?: string
}

/**
 * A memory manager is responsible for deciding what kind of information that a bot should save
 * when it sees a message. It also figures out what information to add to the chat prompt based on this.
 */
export abstract class MemoryManager {
    public readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    abstract loadRelevantMemories(chatSource: string, botName: string, socialContext: string, chatContext: ChatMessage[], triggerMessage: string): Promise<MemoryEntry[]>;

    abstract maybeSaveMemory(chatSource: string, botName: string, socialContext: string, sender: string | null, triggerMessage: string, response: string): Promise<void>;
}
