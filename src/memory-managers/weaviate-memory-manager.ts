import {MemoryEntry, MemoryManager} from './memory-manager';
import {WeaviateMemoryManagerConfig} from '../config';
import weaviate, {WeaviateClient} from 'weaviate-ts-client';
import {ChatMessage} from '../response-generators/response-generator';
import axios from "axios";

const SCHEMA_CLASS_NAME = 'Memory';
const OPEN_AI_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * A memory manager that saves memories to Weaviate.
 */
export class WeaviateMemoryManager extends MemoryManager {
    private readonly weaviateClient: WeaviateClient;
    private readonly typeSpecificConfig: WeaviateMemoryManagerConfig;

    constructor(name: string, typeSpecificConfig: WeaviateMemoryManagerConfig) {
        super(name);

        this.typeSpecificConfig = typeSpecificConfig;

        this.weaviateClient = weaviate.client({
            scheme: typeSpecificConfig.scheme,
            host: typeSpecificConfig.host,
            headers: { 'X-OpenAI-Api-Key': typeSpecificConfig.openAiKey },
        });
    }

    async loadRelevantMemories(
        chatSource: string,
        botName: string,
        socialContext: string,
        chatContext: ChatMessage[],
        message: string,
    ): Promise<MemoryEntry[]> {
        await this.addSchemaIfMissing();
        const result = await this.weaviateClient.graphql
            .get()
            .withClassName(SCHEMA_CLASS_NAME)
            .withFields('date bot chatSource socialContext sender message')
            .withWhere({
                operator: 'And',
                operands: [
                    { operator: 'Equal', path: ['socialContext'], valueString: socialContext },
                    { operator: 'Equal', path: ['bot'], valueString: botName },
                ],
            })
            .withNearText({ concepts: [message] })
            .withGroup({ type: 'closest', force: this.typeSpecificConfig.groupingForce }) // this removes duplicates and near-duplicates, such as a bunch of 'hi egbert' messages
            .do();

        let memories = result.data.Get.Memory;

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
        message: string,
    ): Promise<void> {
        await this.addSchemaIfMissing();

        if (!await this.isMessageWorthRemembering(message)) {
            return;
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
    }

    /**
     * Uses OpenAI to figure out if a message is worth remembering.
     */
    private async isMessageWorthRemembering(message: string) : Promise<boolean> {
        if (!this.typeSpecificConfig.rememberPrompt || !this.typeSpecificConfig.rememberModel || !this.typeSpecificConfig.rememberThreshold) {
            console.log("No rememberPrompt, rememberModel or rememberThreshold configured, so I won't ask OpenAI if this message should be remembered. I'll just remember everything.");
            return true;
        }

        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.typeSpecificConfig.openAiKey}`,
        };

        const prompt = this.typeSpecificConfig.rememberPrompt + "\n```" + message + "```";

        const body = {
            model: this.typeSpecificConfig.rememberModel,
            messages: [
                { role: 'user', content: prompt},
            ],
            temperature: 0,
        };
        // console.log('This is what Weaviate memory manager will send to OpenAI:', body.messages);
        console.log("Asking OpenAI if I should remember this message");
        const response = await axios.post(OPEN_AI_URL, body, { headers: headers });
        const responseContent = response.data.choices[0].message.content;

        // check if the response contains a number between 0 and 10
        const match = responseContent.match(/\b([0-9]|10)\b/);

        if (!match) {
            console.warn(`WARNING: I asked OpenAI to score how important this message is to remember, but I can't find a score in there.\nPrompt: ${JSON.stringify(body.messages, null, 2)}\nResponse: ${JSON.stringify(responseContent, null, 2)}`);
            return false;
        }

        const score = parseInt(match[1]);
        if (score >= this.typeSpecificConfig.rememberThreshold) {
            console.log('I will remember this message. OpenAI says ' + responseContent);
            return true;
        } else {
            console.log('I will forget this message. OpenAI says ' + responseContent)
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
                    name: 'date',
                    dataType: ['date'],
                },
                {
                    name: 'bot',
                    dataType: ['string'],
                },
                {
                    name: 'chatSource',
                    dataType: ['string'],
                },
                {
                    name: 'socialContext',
                    dataType: ['string'],
                },
                {
                    name: 'sender',
                    dataType: ['string'],
                },
                {
                    name: 'message',
                    dataType: ['string'],
                },
            ],
            vectorizer: 'text2vec-openai',
        };

        console.log('Weaviate schema is not defined, creating it now');
        await this.weaviateClient.schema.classCreator().withClass(schemaObject).do();
    }

    private async doesSchemaExist() {
        const schema = await this.weaviateClient.schema.getter().do();
        const classNames = schema.classes?.map((c) => c.class);
        return classNames && classNames.includes(SCHEMA_CLASS_NAME);
    }
}
