const axios = require('axios');
import * as memory from "./memory";

const gptUrl = 'https://api.openai.com/v1/chat/completions';

// 0 = gpt gives the same answer for the same given input, 1 =  more randomness and creativity
// TODO: extract this to a config file
const temperature = 1.0;

type GptRole = 'system' | 'user' | 'assistant';

interface GptMessage {
    role: GptRole;
    content: string;
}

async function gptChat(messages : GptMessage[]) : Promise<string> {
    const body = {
        model: 'gpt-3.5-turbo',
        messages: messages,
        temperature: temperature,
    };

    const gptHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    };
    const response = await axios.post(gptUrl, body, { headers: gptHeaders });
    return response.data.choices[0].message.content;
}

export async function maybeRespond(message: string, author: string, serverName: string, defaultPersonality: string) : Promise<string | null> {
    const messageContainsEgbert = message.toLowerCase().includes('egbert');
    const messageContainsRemember = message.toLowerCase().includes('remember:');
    if (messageContainsEgbert) {
        if (messageContainsRemember) {
            await memory.saveMemory(message, serverName);
        }

        const { memories, customSystemMessage } = await memory.loadMemories(serverName);
        const personality = customSystemMessage || defaultPersonality;
        const messages : GptMessage[] = [
            {role: 'system', content: personality},
            ...memories.map(memory => ({ role: 'user' as GptRole, content: memory })),
            { role: 'user', content: `${author}: ${message}` }
        ];
        return gptChat(messages);
    } else {
        return null;
    }
}
