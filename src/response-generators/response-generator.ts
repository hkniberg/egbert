export interface ResponseGenerator {
    generateResponse(userPrompt: string, botName: string, personality: string, memories: string[], chatHistory: string[]): Promise<string>;
}
