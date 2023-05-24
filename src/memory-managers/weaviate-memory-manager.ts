import { MemoryEntry, MemoryManager } from './memory-manager';
import { WeaviateMemoryManagerConfig } from '../config';
import weaviate, { WeaviateClient } from 'weaviate-ts-client';
import { ChatMessage } from '../response-generators/response-generator';

const SCHEMA_CLASS_NAME = 'Memory';

/**
 * A memory manager that saves memories to Weaviate.
 */
export class WeaviateMemoryManager extends MemoryManager {
    private readonly weaviateClient: WeaviateClient;
    private readonly limit: number;
    private readonly groupingForce: number;

    constructor(name: string, typeSpecificConfig: WeaviateMemoryManagerConfig) {
        super(name);

        this.limit = typeSpecificConfig.limit;
        this.groupingForce = typeSpecificConfig.groupingForce;

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
        triggerMessage: string,
    ): Promise<MemoryEntry[]> {
        await this.addSchemaIfMissing();
        const result = await this.weaviateClient.graphql
            .get()
            .withClassName(SCHEMA_CLASS_NAME)
            .withFields('date bot chatSource socialContext sender trigger')
            .withWhere({
                operator: 'And',
                operands: [
                    { operator: 'Equal', path: ['socialContext'], valueString: socialContext },
                    { operator: 'Equal', path: ['bot'], valueString: botName },
                ],
            })
            .withNearText({ concepts: [triggerMessage] }) // TODO this should probably be the whole chat context, not just the trigger
            .withGroup({ type: 'closest', force: this.groupingForce }) // this removes duplicates and near-duplicates, such as a bunch of 'hi egbert' messages
            .do();

        let memories = result.data.Get.Memory;

        // We need to limit the number of memories.
        // We could limit it in the weaviate query, but that results in too few entries, because of the grouping mechanism.
        console.log(`Found ${memories.length} memories, will limit to ${this.limit}`);
        let memoriesLimited = memories.slice(0, this.limit);

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
        triggerMessage: string,
        response: string,
    ) {
        await this.addSchemaIfMissing();
        const objectToSave = {
            class: SCHEMA_CLASS_NAME,
            properties: {
                date: new Date(),
                bot: botName,
                chatSource: chatSource,
                socialContext: socialContext,
                sender: sender,
                trigger: triggerMessage,
            },
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
                    name: 'sender',
                    dataType: ['string'],
                },
                {
                    name: 'trigger',
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
