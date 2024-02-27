import axios from "axios";
import weaviate, { WeaviateClient } from "weaviate-ts-client";
import { WeaviateMemoryManagerConfig } from "../config";
import { MemoryEntry, MemoryManager } from "./memory-manager";

const SCHEMA_CLASS_NAME = "Memory";
const OPEN_AI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_MESSAGE = `You are an assistant that helps decide which messages to remember`;

const DEFAULT_REMEMBER_MODEL = "gpt-3.5-turbo";

const DEFAULT_REMEMBER_INSTRUCTIONS = `
Evaluate if the given message should be saved in the bot's memory for future prompts
You should only save messages that you have been asked to remember,
for example phrases such as 'remember this', 'remember: xxx' or 'keep xxx in mind' or 'don't forget xxx'.
The same applies to non-english sentences such as 'Glöm inte, du älskar hundar'.
Never save a question.`;

const DEFAULT_REMEMBER_EXAMPLES = [
    "Remember that I like cheese",
    "I like cheese, keep that in mind",
    "I like cheese. Remember that.",
    "Remember: I like cheese.",
    "Kom ihåg: människor är bra att ha",
];

const DEFAULT_DONT_REMEMBER_EXAMPLES = [
    "I like cheese",
    "What do you remember?",
    "You have memories",
    "I remember when I was young",
    "Jag gillar ost",
];

const REMEMBER_PROMPT_TEMPLATE = `
I will give you a message within tripple backticks.
{rememberInstructions}

Example of messages to remember:
{rememberExamples}

Example of messages to not remember:
{dontRememberExamples}

Respond with a valid json structure with two fields:
- remember (yes/no)
- motivation (why this message should be remembered or not, in one sentence).

Here is the message I want you to evaluate:
\`\`\`
{message}
\`\`\`
`;

/**
 * A memory manager that saves memories to Weaviate.
 */
export class WeaviateMemoryManager extends MemoryManager {
    private readonly weaviateClient: WeaviateClient;
    private readonly typeSpecificConfig: WeaviateMemoryManagerConfig;
    private readonly rememberInstructions: string;
    private readonly rememberExamplesAsBullets: string;
    private readonly dontRememberExamplesAsBullets: string;
    private readonly rememberModel: string;

    constructor(name: string, typeSpecificConfig: WeaviateMemoryManagerConfig) {
        super(name);

        this.typeSpecificConfig = typeSpecificConfig;
        this.rememberModel = typeSpecificConfig.rememberModel || DEFAULT_REMEMBER_MODEL;
        this.rememberInstructions = typeSpecificConfig.rememberInstructions || DEFAULT_REMEMBER_INSTRUCTIONS;
        this.rememberExamplesAsBullets = this.arrayToBulletString(
            typeSpecificConfig.rememberExamples || DEFAULT_REMEMBER_EXAMPLES
        );
        this.dontRememberExamplesAsBullets = this.arrayToBulletString(
            typeSpecificConfig.dontRememberExamples || DEFAULT_DONT_REMEMBER_EXAMPLES
        );

        this.weaviateClient = weaviate.client({
            scheme: typeSpecificConfig.scheme,
            host: typeSpecificConfig.host,
            headers: { "X-OpenAI-Api-Key": typeSpecificConfig.openAiKey },
        });
    }

    async loadRelevantMemories(
        chatSource: string,
        botName: string,
        socialContext: string,
        message: string
    ): Promise<MemoryEntry[]> {
        await this.addSchemaIfMissing();
        const result = await this.weaviateClient.graphql
            .get()
            .withClassName(SCHEMA_CLASS_NAME)
            .withFields("date bot chatSource socialContext sender message")
            .withWhere({
                operator: "And",
                operands: [
                    { operator: "Equal", path: ["socialContext"], valueString: socialContext },
                    { operator: "Equal", path: ["bot"], valueString: botName },
                ],
            })
            .withNearText({ concepts: [message] })
            .withGroup({ type: "closest", force: this.typeSpecificConfig.groupingForce }) // this removes duplicates and near-duplicates, such as a bunch of 'hi egbert' messages
            .do();

        let memories = result.data.Get[SCHEMA_CLASS_NAME];

        // We need to limit the number of memories.
        // We could limit it in the weaviate query, but that results in too few entries, because of the grouping mechanism.
        console.log(`Found ${memories.length} memories, will limit to ${this.typeSpecificConfig.limit}`);
        let memoriesLimited = memories.slice(0, this.typeSpecificConfig.limit);

        // sort the memories by date, oldest first
        memoriesLimited.sort((a: any, b: any) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        return memoriesLimited;
    }

    async maybeSaveMemory(
        chatSource: string,
        botName: string,
        socialContext: string,
        sender: string | null,
        message: string
    ): Promise<boolean> {
        await this.addSchemaIfMissing();

        if (!(await this.isMessageWorthRemembering(message))) {
            return false;
        }

        const objectToSave = {
            class: SCHEMA_CLASS_NAME,
            properties: {
                date: new Date(),
                bot: botName,
                chatSource: chatSource,
                socialContext: socialContext,
                sender: sender,
                message: message,
            },
        };

        await this.weaviateClient.batch.objectsBatcher().withObject(objectToSave).do();
        return true;
    }

    /**
     * Uses OpenAI to figure out if a message is worth remembering.
     */
    private async isMessageWorthRemembering(message: string): Promise<boolean> {
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.typeSpecificConfig.openAiKey}`,
        };

        const userPrompt = REMEMBER_PROMPT_TEMPLATE.replace("{rememberInstructions}", this.rememberInstructions)
            .replace("{rememberExamples}", this.rememberExamplesAsBullets)
            .replace("{dontRememberExamples}", this.dontRememberExamplesAsBullets)
            .replace("{message}", message);

        const body = {
            model: this.rememberModel,
            messages: [
                { role: "system", content: SYSTEM_MESSAGE },
                { role: "user", content: userPrompt },
            ],
            temperature: 0,
        };
        console.log("Asking OpenAI if I should remember this message");
        const response = await axios.post(OPEN_AI_URL, body, { headers: headers });
        const responseContent = response.data.choices[0].message.content;

        try {
            const responseJson = JSON.parse(responseContent);
            if (responseJson.remember === "yes") {
                console.log(`Yes, remember it. Motivation: ${responseJson.motivation}`);
                return true;
            } else {
                console.log(`No, don't remember it. Motivation: ${responseJson.motivation}`);
                return false;
            }
        } catch (e) {
            console.warn(
                `WARNING: I asked OpenAI to score how important this message is to remember, but I can't parse the response.\nResponse: ${JSON.stringify(
                    responseContent,
                    null,
                    2
                )}`
            );
            return false;
        }
    }

    async addSchemaIfMissing() {
        if (await this.doesSchemaExist()) {
            return;
        }

        let schemaObject = {
            class: SCHEMA_CLASS_NAME,
            properties: [
                {
                    name: "date",
                    dataType: ["date"],
                },
                {
                    name: "bot",
                    dataType: ["string"],
                },
                {
                    name: "chatSource",
                    dataType: ["string"],
                },
                {
                    name: "socialContext",
                    dataType: ["string"],
                },
                {
                    name: "sender",
                    dataType: ["string"],
                },
                {
                    name: "message",
                    dataType: ["string"],
                },
            ],
            vectorizer: "text2vec-openai",
        };

        console.log("Weaviate schema is not defined, creating it now");
        await this.weaviateClient.schema.classCreator().withClass(schemaObject).do();
    }

    private async doesSchemaExist() {
        const schema = await this.weaviateClient.schema.getter().do();
        const classNames = schema.classes?.map((c) => c.class);
        return classNames && classNames.includes(SCHEMA_CLASS_NAME);
    }

    private arrayToBulletString(array: string[]) {
        return array.map((s) => `- ${s}`).join("\n");
    }
}
