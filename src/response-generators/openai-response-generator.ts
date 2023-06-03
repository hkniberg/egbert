// response-generators/openai-response-generator.ts

import axios from 'axios';
import {ChatMessage, ChatSourceHistory, ResponseGenerator} from './response-generator';
import { encode } from 'gpt-3-encoder';
import {MemoryEntry} from "../memory-managers/memory-manager";

const openAiUrl = 'https://api.openai.com/v1/chat/completions';

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

    async generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        personality: string,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[],
        otherChatSourceHistories: ChatSourceHistory[]
    ): Promise<string> {
        // OpenAI spec here: https://platform.openai.com/docs/api-reference/chat/create

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.typeSpecificConfig.apiKey}`,
        };

        // Add the personality
        const messages: GptMessage[] = [{ role: 'system', content: personality}];

        // Add the memories
        if (memories.length > 0) {
            let memoryString = 'Here are all your memories relevant to this conversation, with message sender in brackets:\n';

            // Go through each memory and add each triggerMessage and response as separate lines in the memoryString
            memories.forEach(memory => {
                const senderString = memory.sender ? `[${memory.sender}]: ` : '';
                memoryString += '* ' + senderString + memory.message + '\n';
            });

            messages.push({ role: 'user', content: memoryString });
        }

        // Add the chat history for the current chat source
        if (chatHistory.length > 0) {
            // add each chat message to the prompt, separately. If the sender is the same as the bot, then use 'assistant' as the role
            chatHistory.forEach(chatMessage => {
                if (chatMessage.sender && chatMessage.sender.toLowerCase() == botName.toLowerCase()) {
                    messages.push({ role: 'assistant', content: chatMessage.message });
                } else {
                    const namePrefix = chatMessage.sender ? `[${chatMessage.sender}]: ` : '';
                    messages.push({ role: 'user', content: namePrefix + chatMessage.message });
                }
            });
        }

        // Add the chat history for other chat sources
        if (otherChatSourceHistories.length > 0) {
            otherChatSourceHistories.forEach(chatSourceHistory => {    
                let historyString = `Here are the recent messages in ${chatSourceHistory.chatSource}:\n`;
                chatSourceHistory.chatHistory.forEach(chatMessage => {
                    historyString += '* ' + chatMessage.message + '\n';
                });
                messages.push({ role: 'user', content: historyString });
            });
        }

        // Add the user prompt
        const senderString = sender ? `[${sender}]: ` : '';
        messages.push({ role: 'user', content: senderString + triggerMessage});

        console.log('This is what we will send to GPT:', messages);

        const body = {
            model: this.typeSpecificConfig.model,
            messages: messages,
            temperature: this.typeSpecificConfig.temperature,
        };

        try {
            const response = await axios.post(openAiUrl, body, { headers: headers });

            const responseContent = response.data.choices[0].message.content;
            const requestTokens = this.getTokenCount(JSON.stringify(messages));
            const responseTokens = this.getTokenCount(responseContent);
            console.log(
                `Request tokens: ${requestTokens}, Response tokens: ${responseTokens}, Total tokens: ${
                    requestTokens + responseTokens
                }`,
            );

            return responseContent;
        } catch (error) {
            console.log('Oops, something went wrong when talking to GPT!!! ', error);
            console.error(error);
            return 'Oops, something went wrong when talking to GPT.';
        }
    }

    private getTokenCount(str: string): number {
        return encode(str).length;
    }
}
