import { ChatMessage, ResponseGenerator } from "./response-generator";
import { MemoryEntry } from "../memory-managers/memory-manager";

export class EchoResponseGenerator implements ResponseGenerator {
    async generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[]
    ): Promise<string> {
        return `Echo ${triggerMessage}`;
    }
}
