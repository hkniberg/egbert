// response-generators/openai-response-generator.ts

import axios from 'axios';
import {ResponseGenerator} from './response-generator';

const openAiUrl = "https://api.openai.com/v1/chat/completions";

interface OpenAiResponseGeneratorConfig {
    apiKey: string; // used for payment. See & generate keys here: https://platform.openai.com/account/api-keys
    model: string; // for example "gpt-3.5-turbo". Listed here: https://platform.openai.com/docs/models/gpt-4
    temperature: number; // 0 = no variation, 1 = lots of variation and creativity
}

// This is from the OpenAI API.
// system = description of bot's personality, user = user message, assistant = bot response
type GptRole = 'system' | 'user' | 'assistant';

interface GptMessage {
    role: GptRole;
    content: string;
}

export class OpenAiResponseGenerator implements ResponseGenerator {
    private readonly typeSpecificConfig: OpenAiResponseGeneratorConfig;

    constructor(typeSpecificConfig: OpenAiResponseGeneratorConfig) {
        this.typeSpecificConfig = typeSpecificConfig;
    }

    async generateResponse(userPrompt: string, botName: string, personality: string, memories: string[]): Promise<string> {
        // OpenAI spec here: https://platform.openai.com/docs/api-reference/chat/create

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.typeSpecificConfig.apiKey}`,
        };

        const messages : GptMessage[] = [{role: 'system', content: personality}];
        if (memories.length > 0) {
            messages.push({role: 'user', content: `You have the following memories:\n${memories.join('\n')}`});
            messages.push({role: 'assistant', content: `Ok, I will take those memories into account when responding`});
        }
        messages.push({role: 'user', content: `${userPrompt}\n${botName}:`})

        const body = {
            model: this.typeSpecificConfig.model,
            messages: messages,
            temperature: this.typeSpecificConfig.temperature,
        };

        const response = await axios.post(openAiUrl, body, { headers: headers });

        return response.data.choices[0].message.content;
    }
}