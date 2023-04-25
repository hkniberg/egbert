const axios = require('axios');
import {saveMemory, loadMemories} from "./memory";

const gptUrl = 'https://api.openai.com/v1/chat/completions';
const gptHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
};

const defaultSystemMessage = process.env.DEFAULT_PERSONALITY;

const temperature = 1.0;

/**
 * @param messages array of objects with role and content. Role should be 'system' or 'user' or 'assistant'.
 * @param callback
 */
async function gptChat(messages, callback) {
    try {
        const body = {
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: temperature,
        };

        const response = await axios.post(gptUrl, body, { headers: gptHeaders });
        callback(response.data.choices[0].message.content);
    } catch (error) {
        console.error(error);
    }
}

export async function maybeRespond(message, author, serverName, callback) {
    const messageContainsEgbert = message.toLowerCase().includes('egbert');
    const messageContainsRemember = message.toLowerCase().includes('remember:');
    if (messageContainsEgbert) {
        if (messageContainsRemember) {
            await saveMemory(message, serverName);
        }

        const { memories, customSystemMessage } = await loadMemories(serverName);
        const systemMessage = customSystemMessage || defaultSystemMessage;
        const messages = [
            {role: 'system', content: systemMessage},
            ...memories.map(memory => ({ role: 'user', content: memory })),
            { role: 'user', content: `${author}: ${message}` }
        ];
        await gptChat(messages, callback);
    }
}
