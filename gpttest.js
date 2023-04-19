const axios = require('axios');

const url = 'https://api.openai.com/v1/chat/completions';
const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer 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',
};

async function gptPost(url, body) {
    try {
        const response = await axios.post(url, body, { headers: headers });
        console.log(JSON.stringify(response.data, null, 4));
    } catch (error) {
        console.error(error);
    }
}

function talkToGpt() {
    const body = {
        model: 'gpt-3.5-turbo',
        messages: [
            {
                role: 'system',
                content:
                    'You are Bob, a very funny and ironic chatbot who never gives a straight answer',
            },
            { role: 'user', content: 'Jim: We should have dinner sometime!' },
            { role: 'user', content: 'Lisa: But I dont even like you' },
            { role: 'user', content: 'Jim: Was that because of what happened last night' },
            { role: 'user', content: 'Lisa: I dont want to talk about that' },
            { role: 'user', content: 'Jim: Bob, help me out here, Lisa refuses to play nice here.' },
            { role: 'user', content: 'Bob:' },
        ],
        temperature: 0.7,
    };
    gptPost(url, body);
}

talkToGpt();
