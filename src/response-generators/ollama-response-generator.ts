// response-generators/ollama-response-generator.ts

import axios from 'axios';
import { ChatMessage, ChatSourceHistory, ResponseGenerator } from './response-generator';
import { MemoryEntry } from '../memory-managers/memory-manager';

const API_BASE_URL = 'http://localhost:11434/api';

interface OllamaResponseGeneratorConfig {
    model: string; // for example "llama2". Listed here: https://ollama.ai/library
    temperature: number; // 0 = no variation, 1 = lots of variation and creativity
    apiBaseUrl?: string; // Defaults to http://localhost:11434/api
}

export class OllamaResponseGenerator implements ResponseGenerator {
    private readonly typeSpecificConfig: OllamaResponseGeneratorConfig;
    private readonly apiBaseUrl: string;

    constructor(typeSpecificConfig: OllamaResponseGeneratorConfig) {
        this.typeSpecificConfig = typeSpecificConfig;
        this.apiBaseUrl = typeSpecificConfig.apiBaseUrl || API_BASE_URL;
    }

    async generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[],
        otherChatSourceHistories: ChatSourceHistory[],
    ): Promise<string> {
        // Ollama spec here: https://github.com/jmorganca/ollama/blob/main/docs/api.md
        const url = `${this.apiBaseUrl}/generate`;

        const headers = {
            'Content-Type': 'application/json',
        };

        const senderString = sender ? `[${sender}]: ` : '';
        const message = senderString + triggerMessage;

        const body = {
            model: this.typeSpecificConfig.model,
            system: personality,
            stream: false,
            prompt: message,
            options: {
                temperature: this.typeSpecificConfig.temperature                
            }
        };

        console.log('This is what we will send to Ollama:', body);

        try {
            const response = await axios.post(url, body, { headers: headers });
            const responseContent = response.data.response;

            // If the response starts with `BOTNAME:` then remove it. Still kind of hacky.
            if (responseContent.toLowerCase().startsWith(botName.toLowerCase() + ':')) {
                return responseContent.substring(botName.length + 1).trim();
            }
            return responseContent;
        } catch (error) {
            console.log('Oops, something went wrong when talking to Ollama!!! ', error);
            console.error(error);
            return 'Oops, something went wrong when talking to Ollama.';
        }
    }
}
