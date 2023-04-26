import { ResponseGenerator } from './response-generator';

export class EchoResponseGenerator implements ResponseGenerator {
    async generateResponse(userPrompt: string, botName: string, personality: string, memories: string[]): Promise<string> {
        return `Echo ${userPrompt}`;
    }
}
