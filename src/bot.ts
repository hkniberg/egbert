import {ResponseGenerator} from "./response-generators/response-generator";

export class Bot {
    private name : string;
    private personality : string;
    private socialContexts : Array<string>;
    private responseGenerator : ResponseGenerator;

    constructor(name : string, personality : string, socialContexts : Array<string>, responseGenerator : ResponseGenerator, ) {
        this.name = name;
        this.personality = personality;
        this.socialContexts = socialContexts;
        this.responseGenerator = responseGenerator;
    }

    getName(): string {
        return this.name;
    }

    async generateResponse(incomingMessage: string) : Promise<string | null> {
        if (!incomingMessage.toLowerCase().includes(this.name.toLowerCase())) {
            return null;
        }

        let memories : Array<string> = []; // TODO load/save memories
        return this.responseGenerator.generateResponse(incomingMessage, this.name, this.personality, memories);
    }

    isMemberOfSocialContext(socialContext: string) {
        return this.socialContexts.includes(socialContext);
    }
}