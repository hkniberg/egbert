import {Bot} from "../bot";

export abstract class ChatSource {
    protected readonly name: string;
    protected readonly socialContext: string;
    protected bots: Array<Bot> = [];

    constructor(name : string, socialContext : string) {
        this.name = name;
        this.socialContext = socialContext;
    }

    abstract start() : void;

    getSocialContext(): string {
        return this.socialContext;
    }

    addBot(bot: Bot) {
        this.bots.push(bot);
    }

    getName(): string {
        return this.name;
    }
}