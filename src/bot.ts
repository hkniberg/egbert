import { ChatMessage, ChatSourceHistory, ResponseGenerator } from './response-generators/response-generator';
import { BotTriggerConfig } from './config';
import { MemoryManager } from "./memory-managers/memory-manager";
import { ChatSource } from './chat-sources/chat-source';

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
    private readonly chatSources: Array<ChatSource> = [];

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

    addChatSource(chatSource: ChatSource) {
        this.chatSources.push(chatSource);
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
     *
     * @param onMessageRemembered Optional callback that will be called if the bot remembers the message, so the chat source can put an emoji on it or something.
     */
    public async generateResponse(
        chatSourceName: string,
        socialContext: string,
        sender: string | null,
        triggerMessage: string,
        chatContext: ChatMessage[],
        onMessageRemembered?: () => void,
    ): Promise<string | null> {
        console.log(`${this.name} received message "${triggerMessage}" in social context ${socialContext}`);

        let memories = this.memoryManager ? await this.memoryManager.loadRelevantMemories(chatSourceName, this.name, socialContext, triggerMessage) : [];

        if (this.memoryManager) {
            // This could be done asynchronously, but seems to cause rate limit issues. Testing sync for now.
            await this.memoryManager.maybeSaveMemory(chatSourceName, this.name, socialContext, sender, triggerMessage).catch((error) => {
                console.error("Failed to save memory", error);
            }).then((saved) => {
                if (saved && onMessageRemembered) {
                    onMessageRemembered();
                }
            });
        }

        // Get the chat history from other chat sources
        let otherChatSourceHistories: ChatSourceHistory[] = [];
        for (let chatSource of this.chatSources) {
            // Don't include the chat source that the message came from. Include only those that match the crossReferencePattern.
            if (chatSource.getName() !== chatSourceName && chatSource.getCrossReferencePattern()?.test(triggerMessage)) {
                let chatSourceHistory = await chatSource.getChatHistory();
                otherChatSourceHistories.push({ chatSource: chatSource.getName(), chatHistory: chatSourceHistory });
            }
        }

        let response: string = await this.responseGenerator.generateResponse(
            triggerMessage,
            sender,
            this.name,
            this.personality,
            memories,
            chatContext,
            otherChatSourceHistories,
        );

        console.log(`${this.name} will respond`);
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
