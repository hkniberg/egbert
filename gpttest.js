require('dotenv').config(); //initialize dotenv
const axios = require('axios');

console.log("Token: " + process.env.GPT_KEY);

const gptUrl = 'https://api.openai.com/v1/chat/completions';
const gptHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + process.env.GPT_KEY,
};
async function callGpt(url, body) {
    try {
        const response = await axios.post(url, body, { headers: gptHeaders });
        console.log(response.data.choices[0].message.content);
        //console.log(JSON.stringify(response.data, null, 4));
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
    callGpt(gptUrl, body);
}

talkToGpt();
