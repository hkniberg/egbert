import { MinecraftChatSource } from '../../src/chat-sources/minecraft-chat-source';
import { MinecraftChatSourceConfig } from '../../src/config';
import { Bot } from '../../src/bot';
import { EchoResponseGenerator } from '../../src/response-generators/echo-response-generator';
import { Rcon } from 'rcon-client';

// This ugly pile of code makes a mock version of rcon-client.
// The tricky bit is that we need to mock the Rcon.connect() method to return a mock Rcon object,
// and then provide a send() and end() methods on that Rcon object.
jest.mock('rcon-client', () => {
    return {
        Rcon: {
            connect: jest.fn().mockImplementation(() => {
                return {
                    send: jest.fn().mockResolvedValue('Server response'),
                    end: jest.fn(),
                };
            }),
        },
    };
});

// Create a fake config. The only thing that is actually used is regexPattern.
const minecraftChatSourceConfig: MinecraftChatSourceConfig = {
    rconHost: 'localhost',
    rconPort: 25575,
    rconPassword: 'test',
    serverLogPath: 'test.log',
    filter: '(?:\\[Bot server\\]:|DedicatedServer\\/]:)\\s?(.*)',
};

describe('MinecraftChatSource', () => {
    let chatSource: MinecraftChatSource;

    beforeEach(() => {
        (Rcon.connect as jest.Mock).mockClear();
        const bot = new Bot('testBot', 'You are a test bot', null, ['testContext'], new EchoResponseGenerator());
        chatSource = new MinecraftChatSource('minecraftTest', 'testContext', 100, minecraftChatSourceConfig);
        chatSource.addBot(bot);
    });

    test('Test 1: No response is sent for non-matching log line', async () => {
        const nonMatchingLine = 'Hi testBot';
        await chatSource.processLine(nonMatchingLine);
        expect(Rcon.connect).not.toHaveBeenCalled();
    });

    test('Test 2: Response is sent for matching log line', async () => {
        const matchingLine = 'DedicatedServer/]: Hi testBot';
        await chatSource.processLine(matchingLine);

        expect(Rcon.connect).toHaveBeenCalled();
    });
});
