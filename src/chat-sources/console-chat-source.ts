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
        stdin.addListener('data', async (incomingMessage) => {
            // for some reason incomingMessage is a character buffer or something like that,
            // so we convert it to string before sending it to the bot
            const incomingMessageAsTrimmedString = ('' + incomingMessage).trim();
            const messagesToAddToChatHistory: string[] = ['User: ' + incomingMessageAsTrimmedString];

            // send the message to each bot, and then each bot decides whether or not to respond
            // for example depending on if the message contains the bot's name.
            for (const bot of this.bots) {
                const responseMessage = await bot.generateResponse(
                    this.name,
                    this.defaultSocialContext as string,
                    incomingMessageAsTrimmedString,
                    this.chatHistory.getAll(),
                );
                if (responseMessage) {
                    messagesToAddToChatHistory.push(bot.getName() + ': ' + responseMessage);
                    console.log(`[${this.defaultSocialContext as string}] ${bot.getName()}: ${responseMessage}`);
                }
            }
            // We add the messages to the chat history after all bots have had a chance to respond
            this.chatHistory.addAll(messagesToAddToChatHistory);
        });
    }
}
