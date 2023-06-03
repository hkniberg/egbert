import {ChatSource} from './chat-source';
import {CappedArray} from '../util/capped-array';
import {ChatMessage} from "../response-generators/response-generator";

// A regexp to parse out the sender name (optional), and the message. Follows this format:
//
// "Jim: Hi there"
// => sender is "Jim", message is "Hi there"
//
// "Hi there"
// => sender is null, message is "Hi there"
//
// Sender must be a full word, so in this it ignores sender:
// "Hey Sam, remember: Life is good
// => sender is null, message is "Hey Sam, remember: Life is good
//
const REGEXP = /(?:^(\w+):\s*)?(.+)/;
const DEFAULT_USER = 'ConsoleUser'

export class ConsoleChatSource extends ChatSource {
    private readonly chatHistory: CappedArray<ChatMessage>;

    constructor(
        name: string, 
        defaultSocialContext: string | null, 
        maxChatHistoryLength: number,
        crossReferencePattern: string | null,
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength, crossReferencePattern);
        this.chatHistory = new CappedArray<ChatMessage>(maxChatHistoryLength);
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
            const incomingMessage = ('' + incomingMessageRaw).trim();

            const strmatch = incomingMessage.match(REGEXP);
            if (!strmatch) {
                // Not sure if this can happen, but gotta check anyway.
                return;
            }

            const sender = strmatch[1] ? strmatch[1].trim() : DEFAULT_USER;
            const triggerMessage = strmatch[2].trim();

            const messagesToAddToChatHistory: ChatMessage[] = [{sender: sender, message: triggerMessage}];

            // send the message to each responding bot
            const respondingBots = this.getRespondingBots(incomingMessage);
            if (respondingBots.length === 0) {
                console.log(`No bots want to respond to this`);
            }

            for (const bot of respondingBots) {
                const responseMessage = await bot.generateResponse(
                    this.name,
                    this.defaultSocialContext as string,
                    sender,
                    triggerMessage,
                    this.chatHistory.getAll(),
                );
                if (responseMessage) {
                    messagesToAddToChatHistory.push({sender: bot.getName(), message: responseMessage});
                    console.log(`[${this.name} ${this.defaultSocialContext as string}] [${bot.getName()}]: ${responseMessage}`);
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
