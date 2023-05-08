import { ResponseGenerator } from './response-generators/response-generator';
import { loadMemories } from './memory';
import { saveMemory } from './memory';
import { BotTriggerConfig } from './config';

const REMEMBER_KEYWORD = 'remember:'; // config param perhaps?

// Used to define which types of messages the bot will respond to,
// and the probability of responding.
interface BotTrigger {
    pattern: RegExp;
    socialContext?: string; // optionally we could limit respones to one social context
    probability: number;
}

export class Bot {
    private readonly name: string;
    private readonly personality: string;
    private readonly memoriesFolder: string | null;
    private readonly socialContexts: Array<string>;
    private readonly responseGenerator: ResponseGenerator;
    private readonly botTriggers: Array<BotTrigger>;

    constructor(
        name: string,
        personality: string,
        memoriesFolder: string | null,
        socialContexts: Array<string>,
        botTriggerConfigs: Array<BotTriggerConfig> | null,
        responseGenerator: ResponseGenerator,
    ) {
        this.name = name;
        this.personality = personality;
        this.memoriesFolder = memoriesFolder ? memoriesFolder : 'memories';
        this.socialContexts = socialContexts;

        if (botTriggerConfigs && botTriggerConfigs.length > 0) {
            this.botTriggers = botTriggerConfigs.map(createBotTrigger);
        } else {
            // No bot triggers were given, so make a default trigger that matches the bot name
            this.botTriggers = [
                {
                    pattern: new RegExp(`\\b${this.name}\\b`, 'i'),
                    probability: 1.0,
                },
            ];
        }

        this.responseGenerator = responseGenerator;
    }

    getName(): string {
        return this.name;
    }

    /**
     * Checks all bot triggers to see if any will respond to the given message & socialContext.
     * Takes probability into account.
     */
    public willRespond(socialContext: string, incomingMessage: string): boolean {
        return this.botTriggers.some((botTrigger) => doesTriggerApply(botTrigger, socialContext, incomingMessage));
    }

    public async generateResponse(
        socialContext: string,
        incomingMessage: string,
        chatHistory: string[],
    ): Promise<string | null> {
        if (!this.willRespond(socialContext, incomingMessage)) {
            return null;
        }
        console.log(`${this.name} received message "${incomingMessage}" in social context ${socialContext}`);
        this.maybeSaveMemory(incomingMessage, socialContext);

        let memories = await loadMemories(this.name, socialContext, this.memoriesFolder);
        console.log(
            `   ${this.name} has ${memories.length} memories, and a chat history of length ${chatHistory?.length}`,
        );
        let response = await this.responseGenerator.generateResponse(
            incomingMessage,
            this.name,
            this.personality,
            memories,
            chatHistory,
        );
        console.log(`   ${this.name} will respond: ${response}`);
        return response;
    }

    isMemberOfSocialContext(socialContext: string) {
        return this.socialContexts.includes(socialContext);
    }

    // not async because we don't need to wait for this to finish
    private maybeSaveMemory(incomingMessage: string, socialContext: string) {
        if (!this.memoriesFolder) {
            return;
        }

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

function createBotTrigger(botTriggerConfig: BotTriggerConfig) {
    return {
        pattern: new RegExp(botTriggerConfig.pattern, 'i'),
        socialContext: botTriggerConfig.socialContext,
        probability: botTriggerConfig.probability ? botTriggerConfig.probability : 1,
    };
}

/**
 * Checks if the given bot trigger will respond to the given message in the given social context.
 * Also takes probability into account.
 */
function doesTriggerApply(trigger: BotTrigger, socialContext: string, message: string) {
    if (trigger.socialContext && trigger.socialContext !== socialContext) {
        return false;
    }
    const randomNumber = Math.random();
    if (randomNumber > trigger.probability) {
        console.log(
            `Randomly ignoring this message (probability of response is ${trigger.probability}, I rolled a ${randomNumber})`,
        );
        return false;
    }
    return trigger.pattern.test(message);
}
