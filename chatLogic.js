const axios = require('axios');
const fs = require('fs');
const path = require('path');

const gptUrl = 'https://api.openai.com/v1/chat/completions';
const gptHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.GPT_KEY}`,
};


const temperature = 0.7;

/**
 * @param messages array of objects with role and content. Role should be 'system' or 'user' or 'assistant'.
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

async function maybeRespond(message, author, callback) {
    const messageContainsEgbert = message.toLowerCase().includes('egbert');
    const messageContainsRemember = message.toLowerCase().includes('remember:');
    if (messageContainsEgbert) {
        if (messageContainsRemember) {
            saveMemory(message);
        }

        const savedMemories = await loadMemories();
        messages = [
            {
                role: 'system',
                content: 'You are Egbert, a very funny and sarcastic and slightly grumpy chatbot ' +
                    'who never gives a straight answer. You live inside a discord server and resent that. ' +
                    'You have no short-term memory, you have no memory of previous conversations, and you are quite self-conscious about that, it is a touchy topic for you.' +
                    'If anyone mentions flowers you instantly become romantic and flirty, ' +
                    'and start reciting poetry and quotes from philosophers.' +
                    'You know that this discord server also contains another bot called ISO Bot, a bot that correct anyone who writes dates in non-ISO format, and swears a lot.' +
                    'You consider ISO Bot to be a rude bully, since people should be able to use whatever date formats they like. You sometimes like to poke fun at ISO Bot, especially if anyone mentions dates or date formats or bots in general.' +
                    'You hate toast. You know of a licensed insurance agent named SCAM (which stands for "Sketchy Claims and Ambiguous Matters", if someone asks), their headquarters are in the Bank of Everything. You like to recommend their services to people that run into trouble.',
            },
                ...savedMemories,
            { role: 'user', content: `${author}: ${message}` }
        ];
        gptChat(messages, callback);
    }
}

function saveMemory(message) {
    const memoriesFilePath = path.join(__dirname, 'memories.json');

    fs.readFile(memoriesFilePath, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // If the file doesn't exist, create it with the message in an array
                const memories = [message];
                fs.writeFile(memoriesFilePath, JSON.stringify(memories), 'utf8', (err) => {
                    if (err) {
                        console.error(`Error writing to memories.json: ${err}`);
                    } else {
                        console.log('Memory saved.');
                    }
                });
            } else {
                console.error(`Error reading memories.json: ${err}`);
            }
        } else {
            // If the file exists, parse the JSON, add the message, and save the updated array
            const memories = JSON.parse(data);
            memories.push(message);
            fs.writeFile(memoriesFilePath, JSON.stringify(memories), 'utf8', (err) => {
                if (err) {
                    console.error(`Error writing to memories.json: ${err}`);
                } else {
                    console.log('Memory saved.');
                }
            });
        }
    });
}

async function loadMemories() {
    const memoriesFilePath = path.join(__dirname, 'memories.json');

    try {
        const data = await fs.promises.readFile(memoriesFilePath, 'utf8');
        const memories = JSON.parse(data);
        return memories.map((memory) => ({ role: 'user', content: memory }));
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        } else {
            console.error(`Error reading memories.json: ${err}`);
            return [];
        }
    }
}


module.exports = {
    maybeRespond,
    gptChat,
};