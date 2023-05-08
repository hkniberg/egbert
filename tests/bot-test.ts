import { Bot } from '../src/bot';
import { EchoResponseGenerator } from '../src/response-generators/echo-response-generator';
import { BotTriggerConfig } from '../src/config';

describe('Bot', () => {
    let bot: Bot;
    let testSocialContext = 'testContext';

    beforeEach(() => {
        bot = new Bot('testBot', 'You are a test bot', null, [testSocialContext], null, new EchoResponseGenerator());
    });

    test('Responds to its own name', async () => {
        const message = `Hi testBot`;
        const response = await bot.generateResponse(testSocialContext, message, []);
        expect(response).toEqual(`Echo ${message}`);
    });

    test('Responds to custom bot trigger', async () => {
        const customBotTrigger: BotTriggerConfig = {
            pattern: '\\bhello\\b',
            socialContext: testSocialContext,
            probability: 1,
        };

        const botWithCustomTrigger = new Bot(
            'testBot',
            'You are a test bot',
            null,
            [testSocialContext],
            [customBotTrigger],
            new EchoResponseGenerator(),
        );

        const incomingMessage = 'OK hello there how are you?';
        const response = await botWithCustomTrigger.generateResponse(testSocialContext, incomingMessage, []);

        expect(response).toEqual(`Echo ${incomingMessage}`);
    });

    test("Does not respond when the message doesn't match any botTriggers", async () => {
        const incomingMessage = 'Wonder what the weather is going to be tomorrow';
        const response = await bot.generateResponse(testSocialContext, incomingMessage, []);

        expect(response).toBeNull();
    });
});
