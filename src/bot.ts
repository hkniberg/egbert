import {ResponseGenerator} from "./response-generators/response-generator";
import {loadMemories} from "./memory";
import {saveMemory} from "./memory";

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

    async generateResponse(socialContext : string, incomingMessage: string) : Promise<string | null> {
        if (!incomingMessage.toLowerCase().includes(this.name.toLowerCase())) {
            return null;
        }

        const memoriesFolder = "./memories"
        if (!this.isMemberOfSocialContext(socialContext)) {
            return null;
        }
        let memories = await loadMemories(this.name, socialContext, memoriesFolder);
        let response = await this.responseGenerator.generateResponse(incomingMessage, this.name, this.personality, memories);

        return response;
    }

    isMemberOfSocialContext(socialContext: string) {
        return this.socialContexts.includes(socialContext);
    }
}
