import { ChatMessage, ChatSourceHistory, ResponseGenerator } from "./response-generator";
import { MemoryEntry } from "../memory-managers/memory-manager";

export class EchoResponseGenerator implements ResponseGenerator {
    async generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        botPrompt: string,
        chatSourcePrompt: string | null,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[],
        otherChatSourceHistories: ChatSourceHistory[],
        chatSourceName: string,
        socialContext: string
    ): Promise<string> {
        return `Echo ${triggerMessage}`;
    }
}
