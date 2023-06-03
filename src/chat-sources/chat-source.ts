import { Bot } from '../bot';
import { ChatMessage } from '../response-generators/response-generator';
import { noEmptyString } from '../util/utils';

/**
 * A ChatSource is a source of chat messages. For example Discord server, a Minecraft server, or a console.
 * When started it will connect to a server (the details vary depending on which type of chat source),
 * listen for messages, asks bots to generate responses, and send the response(s) back.
 * All bots in the same social context are given a chance to generate a response.
 */
export abstract class ChatSource {
    protected readonly name: string;
    // will never be empty string
    protected readonly defaultSocialContext: string | null;
    protected bots: Array<Bot> = [];
    protected maxChatHistoryLength: number;
    protected crossReferencePattern: RegExp | null;

    constructor(name: string, defaultSocialContext: string | null, maxChatHistoryLength: number, crossReferencePattern: string | null) {
        this.name = name;
        this.defaultSocialContext = noEmptyString(defaultSocialContext);
        this.maxChatHistoryLength = maxChatHistoryLength;
        this.crossReferencePattern = crossReferencePattern ? new RegExp(crossReferencePattern) : null;
    }

    abstract start(): void;

    getDefaultSocialContext(): string | null {
        return this.defaultSocialContext;
    }

    addBot(bot: Bot) {
        this.bots.push(bot);
    }

    getName(): string {
        return this.name;
    }

    getSocialContexts(): string[] {
        return this.defaultSocialContext ? [this.defaultSocialContext] : [];
    }

    getCrossReferencePattern(): RegExp | null {
        return this.crossReferencePattern;
    }

    async getChatHistory(): Promise<ChatMessage[]> {
        return [];
    }

}
