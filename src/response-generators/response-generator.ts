export interface ResponseGenerator {
    generateResponse(userPrompt: string, botName: string, personality: string, memories: string[]): Promise<string>;
}
