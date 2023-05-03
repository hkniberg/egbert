import {ResponseGenerator} from "./response-generators/response-generator";
import {loadMemories} from "./memory";
import {saveMemory} from "./memory";

const REMEMBER_KEYWORD = "remember:"; // config param perhaps?

export class Bot {
    private readonly name : string;
    private readonly personality : string;
    private readonly memoriesFolder: string | null;
    private readonly socialContexts : Array<string>;
    private readonly responseGenerator : ResponseGenerator;

    constructor(name : string, personality : string, memoriesFolder : string, socialContexts : Array<string>, responseGenerator : ResponseGenerator) {
        this.name = name;
        this.personality = personality;
        this.memoriesFolder = memoriesFolder;
        this.socialContexts = socialContexts;
        this.responseGenerator = responseGenerator;
    }

    getName(): string {
        return this.name;
    }

    public willRespond(socialContext : string, incomingMessage: string) : boolean {
        return contains(incomingMessage, this.name) && this.isMemberOfSocialContext(socialContext);
    }

    public async generateResponse(socialContext : string, incomingMessage: string, chatHistory: string[]) : Promise<string | null> {
        if (!this.willRespond(socialContext, incomingMessage)) {
            return null;
        }
        console.log(`${this.name} received message "${incomingMessage}" in social context ${socialContext}`);
        this.maybeSaveMemory(incomingMessage, socialContext);

        const memoriesFolder = "./memories"
        let memories = await loadMemories(this.name, socialContext, memoriesFolder);
        console.log(`   ${this.name} has ${memories.length} memories, and a chat history of length ${chatHistory?.length}`)
        let response = await this.responseGenerator.generateResponse(incomingMessage, this.name, this.personality, memories, chatHistory);
        console.log(`   ${this.name} will respond: ${response}`)
        return response;
    }

    isMemberOfSocialContext(socialContext: string) {
        return this.socialContexts.includes(socialContext);
    }

    // not async because we don't need to wait for this to finish
    private maybeSaveMemory(incomingMessage: string, socialContext: string) {
        const indexOfRemember = incomingMessage.toLowerCase().indexOf(REMEMBER_KEYWORD);
        if (indexOfRemember > -1) {
            const memory = incomingMessage.substring(indexOfRemember + REMEMBER_KEYWORD.length + 1);
            saveMemory(memory, this.name, socialContext, this.memoriesFolder);
            console.log(`${this.name} saved memory for context ${socialContext}: ${memory}`);
        }
    }

    isMemberOfAnySocialContext(socialContexts: string[]) {
        // check if there is any overlap between the given array and this.socialContexts
        return socialContexts.some((socialContext) => this.isMemberOfSocialContext(socialContext));
    }
}

function contains(outerString: string, innerString: string) {
    return outerString.toLowerCase().includes(innerString.toLowerCase());
}