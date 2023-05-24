import {ResponseGenerator} from './response-generators/response-generator';
import {BotTriggerConfig} from './config';
import {MemoryEntry, MemoryManager} from "./memory-managers/memory-manager";

// Used to define which types of messages the bot will respond to,
// and the probability of responding.
interface BotTrigger {
    pattern: RegExp;
    socialContext?: string; // optionally we could limit responses to one social context
    probability: number;
}

export class Bot {
    private readonly name: string;
    private readonly personality: string;
    private readonly memoryManager: MemoryManager | null;
    private readonly socialContexts: Array<string>;
    private readonly responseGenerator: ResponseGenerator;
    private readonly botTriggers: Array<BotTrigger>;

    constructor(
        name: string,
        personality: string,
        memoryManager: MemoryManager | null,
        socialContexts: Array<string>,
        botTriggerConfigs: Array<BotTriggerConfig> | null,
        responseGenerator: ResponseGenerator,
    ) {
        this.name = name;
        this.personality = personality;
        this.memoryManager = memoryManager;
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

    /**
     * Uses the response generator to generate a response to the given message.
     * Includes chat context (recent chat messages before the incoming message) and any relevant memories in the prompt.
     * It is up to the caller to call willRespond() first to check if the bot wants to respond.
     * That's a separate call to avoid having to load the chat context unnecessarily if the bot isn't going to respond.
     */
    public async generateResponse(
        chatSource: string,
        socialContext: string,
        triggerMessage: string,
        chatContext: string[],
    ): Promise<string | null> {
        console.log(`${this.name} received message "${triggerMessage}" in social context ${socialContext}`);

        let memories = this.memoryManager ? await this.memoryManager.loadRelevantMemories(chatSource, this.name, socialContext, chatContext, triggerMessage) : [];

        let response = await this.responseGenerator.generateResponse(
            triggerMessage,
            this.name,
            this.personality,
            memories,
            chatContext,
        );

        if (this.memoryManager) {
            // Save the memory asynchronously, but log if it fails for some reason
            this.memoryManager.maybeSaveMemory(chatSource, this.name, socialContext, triggerMessage, response).catch((error) => {
                console.error("Failed to save memory", error);
            });
        }

        console.log(`   ${this.name} will respond: ${response}`);
        return response;
    }

    isMemberOfSocialContext(socialContext: string) {
        return this.socialContexts.includes(socialContext);
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
