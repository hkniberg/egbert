import { ChatSource } from './chat-source';
import { CappedArray } from '../util/capped-array';

export class ConsoleChatSource extends ChatSource {
    private readonly chatHistory: CappedArray<string>;

    constructor(name: string, defaultSocialContext: string | null, maxChatHistoryLength: number) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        this.chatHistory = new CappedArray<string>(maxChatHistoryLength);
    }

    start(): void {
        if (!this.defaultSocialContext) {
            console.log("Warning: ConsoleChatSource has no default social context, so it won't do anything");
            return;
        }

        const stdin = process.openStdin();
        stdin.addListener('data', async (incomingMessageRaw) => {
            // for some reason incomingMessageRaw is a character buffer or something like that,
            // so we convert it to string before sending it to the bot
            const incomingMessage = '[ConsoleUser]: ' + ('' + incomingMessageRaw).trim();
            const messagesToAddToChatHistory: string[] = [incomingMessage];

            // send the message to each responding bot
            const respondingBots = this.getRespondingBots(incomingMessage);
            if (respondingBots.length === 0) {
                console.log(`No bots want to respond to this`);
            }

            for (const bot of respondingBots) {
                const responseMessage = await bot.generateResponse(
                    this.name,
                    this.defaultSocialContext as string,
                    incomingMessage,
                    this.chatHistory.getAll(),
                );
                if (responseMessage) {
                    let responseMessageIncludingBotName = `[${bot.getName()}]: ${responseMessage}`;
                    messagesToAddToChatHistory.push(responseMessageIncludingBotName);
                    console.log(`[${this.name} ${this.defaultSocialContext as string}] ${responseMessageIncludingBotName}`);
                }
            }
            // We add the messages to the chat history after all bots have had a chance to respond
            this.chatHistory.addAll(messagesToAddToChatHistory);
        });
    }

    private getRespondingBots(incomingMessage: string) {
        return this.bots.filter((bot) => bot.willRespond(this.defaultSocialContext as string, incomingMessage));
    }
}
