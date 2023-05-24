import {MemoryEntry, MemoryManager} from "./memory-manager";
import {WeaviateMemoryManagerConfig} from "../config";
import weaviate, {WeaviateClient} from 'weaviate-ts-client';

const SCHEMA_CLASS_NAME = 'Memory';

/**
 * A memory manager that saves memories to Weaviate.
 */
export class WeaviateMemoryManager extends MemoryManager {
    private readonly weaviateClient: WeaviateClient;
    private readonly limit: number;

    constructor(name: string, typeSpecificConfig: WeaviateMemoryManagerConfig) {
        super(name);

        this.limit = typeSpecificConfig.limit;

        this.weaviateClient = weaviate.client({
            scheme: typeSpecificConfig.scheme,
            host: typeSpecificConfig.host,
            headers: { 'X-OpenAI-Api-Key': typeSpecificConfig.openAiKey }
        });

    }

    async loadRelevantMemories(chatSource: string, botName: string, socialContext: string, chatContext: string[], triggerMessage: string): Promise<MemoryEntry[]> {
        await this.addSchemaIfMissing();
        const result = await this.weaviateClient.graphql
            .get()
            .withClassName(SCHEMA_CLASS_NAME)
            .withFields('date bot chatSource socialContext trigger response')
            .withNearText({ concepts: [triggerMessage] })
            .withLimit(this.limit) // TODO
            .do();

        return result.data.Get.Memory;
    }

    async maybeSaveMemory(chatSource: string, botName: string, socialContext: string, triggerMessage: string, response: string) {
        await this.addSchemaIfMissing();
        const objectToSave = {
            class: SCHEMA_CLASS_NAME,
            properties: {
                date: new Date(),
                bot: botName,
                chatSource: chatSource,
                socialContext: socialContext,
                trigger: triggerMessage,
                response: response
            }
        };

        await this.weaviateClient.batch.objectsBatcher().withObject(objectToSave).do();
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
                    name: 'trigger',
                    dataType: ['string'],
                },
                {
                    name: 'response',
                    dataType: ['string'],
                }
            ],
            "vectorizer": "text2vec-openai"
        }

        console.log("Weaviate schema is not defined, creating it now")
        await this.weaviateClient.schema.classCreator().withClass(schemaObject).do();
    }

    private async doesSchemaExist() {
        const schema = await this.weaviateClient.schema.getter().do();
        const classNames = schema.classes?.map(c => c.class);
        return classNames && classNames.includes(SCHEMA_CLASS_NAME);
    }
}
