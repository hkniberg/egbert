import { ResponseGenerator } from './response-generator';
import {MemoryEntry} from "../memory-managers/memory-manager";

export class EchoResponseGenerator implements ResponseGenerator {
    async generateResponse(
        triggerMessage: string,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: string[],
    ): Promise<string> {
        return `Echo ${triggerMessage}`;
    }
}
