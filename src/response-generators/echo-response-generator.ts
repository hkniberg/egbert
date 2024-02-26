import { ChatMessage, ResponseGenerator } from "./response-generator";
import { MemoryEntry } from "../memory-managers/memory-manager";

export class EchoResponseGenerator implements ResponseGenerator {
    async generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        botPrompt: string,
        chatSourcePrompt: string | null,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[]
    ): Promise<string> {
        return `Echo ${triggerMessage}`;
    }
}
