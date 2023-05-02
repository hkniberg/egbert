import {Bot} from "../bot";
import {noEmptyString} from "../utils";
export abstract class ChatSource {
    protected readonly name: string;
    // will never be empty string
    protected readonly defaultSocialContext: string | null;
    protected bots: Array<Bot> = [];
    protected maxChatHistoryLength: number;

    constructor(name: string, defaultSocialContext: string | null, maxChatHistoryLength: number) {
        this.name = name;
        this.defaultSocialContext = noEmptyString(defaultSocialContext);
        this.maxChatHistoryLength = maxChatHistoryLength;
    }

    abstract start() : void;

    getDefaultSocialContext(): string | null {
        return this.defaultSocialContext;
    }

    addBot(bot: Bot) {
        this.bots.push(bot);
    }

    getName(): string {
        return this.name;
    }

    getSocialContexts() : string[] {
        return this.defaultSocialContext ? [this.defaultSocialContext] : [];
    }
}