const axios = require('axios');
const fs = require('fs');
const path = require('path');

const gptUrl = 'https://api.openai.com/v1/chat/completions';
const gptHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GPT_KEY}`,
};
const defaultSystemMessage = process.env.DEFAULT_GPT_SYSTEM_MESSAGE;

const temperature = 0.7;

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



async function maybeRespond(message, author, serverName, callback) {
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

async function saveMemory(message, serverName) {
    const memoriesFolder = path.join(__dirname, 'memories');
    const sanitizedFilename = sanitizeFilename(serverName);
    const memoriesFilePath = path.join(memoriesFolder, `${sanitizedFilename}.json`);


    try {
        await fs.promises.mkdir(memoriesFolder, { recursive: true });


        let serverData;

        try {
            await fs.promises.access(memoriesFilePath);
            const fileContent = await fs.promises.readFile(memoriesFilePath, 'utf-8');
            serverData = JSON.parse(fileContent) || {};
        } catch (error) {
            console.log('No existing memories file found, creating a new one.');
            serverData = { memories: [], customSystemMessage: null };
            await fs.promises.writeFile(memoriesFilePath, JSON.stringify(serverData, null, 2), 'utf-8');
        }

        serverData.memories = serverData.memories || [];

        serverData.memories.push(message);

        await fs.promises.writeFile(memoriesFilePath, JSON.stringify(serverData, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving memory:', error);
    }
}

async function loadMemories(serverName) {
    const sanitizedFilename = sanitizeFilename(serverName);
    const memoriesFilePath = path.join(__dirname, 'memories', `${sanitizedFilename}.json`);

    try {
        const fileContent = await fs.promises.readFile(memoriesFilePath, 'utf-8');
        const serverData = JSON.parse(fileContent);

        return {
            memories: serverData.memories || [],
            customSystemMessage: serverData.customSystemMessage || null,
        };
    } catch (error) {
        //console.error('Error loading memories:', error);
        return { memories: [], customSystemMessage: null };
    }
}

// ...

function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
}


module.exports = {
    maybeRespond,
    gptChat,
};