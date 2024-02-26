import { MemoryManager } from "./memory-manager";
import { KeywordTriggeredMemoryManager } from "./keyword-triggered-memory-manager";
import { KeywordTriggeredMemoryManagerConfig, MemoryManagerConfig, WeaviateMemoryManagerConfig } from "../config";
import { WeaviateMemoryManager } from "./weaviate-memory-manager";

function createMemoryManager(memoryManagerConfig: MemoryManagerConfig): MemoryManager {
    if (memoryManagerConfig.type === "keywordTriggered") {
        return new KeywordTriggeredMemoryManager(
            memoryManagerConfig.name,
            memoryManagerConfig.typeSpecificConfig as KeywordTriggeredMemoryManagerConfig
        );
    } else if (memoryManagerConfig.type === "weaviate") {
        return new WeaviateMemoryManager(
            memoryManagerConfig.name,
            memoryManagerConfig.typeSpecificConfig as WeaviateMemoryManagerConfig
        );
    } else {
        throw "Unknown memory manager type: " + memoryManagerConfig.type;
    }
}

export function createMemoryManagers(memoryManagerConfigs: Array<MemoryManagerConfig> | null) {
    if (!memoryManagerConfigs) {
        return new Map<string, MemoryManager>();
    }

    const memoryManagers: Map<string, MemoryManager> = new Map();
    for (const memoryManagerConfig of memoryManagerConfigs) {
        memoryManagers.set(memoryManagerConfig.name, createMemoryManager(memoryManagerConfig));
    }
    return memoryManagers;
}
