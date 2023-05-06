import { ResponseGenerator } from './response-generator';

export class EchoResponseGenerator implements ResponseGenerator {
    async generateResponse(
        userPrompt: string,
        botName: string,
        personality: string,
        memories: string[],
        chatHistory: string[],
    ): Promise<string> {
        return `Echo ${userPrompt}`;
    }
}
