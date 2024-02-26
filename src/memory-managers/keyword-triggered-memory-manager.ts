import * as fs from "fs/promises";
import * as path from "path";
import { KeywordTriggeredMemoryManagerConfig } from "../config";
import { MemoryEntry, MemoryManager } from "./memory-manager";

/**
 * A simple memory manager that saves memories to a file when a trigger message matches a pattern such as "Remember: "
 */
export class KeywordTriggeredMemoryManager extends MemoryManager {
    private readonly memoriesFolder: string;
    private readonly pattern: RegExp;

    constructor(name: string, typeSpecificConfig: KeywordTriggeredMemoryManagerConfig) {
        super(name);
        this.memoriesFolder = typeSpecificConfig.memoriesFolder;
        this.pattern = new RegExp(typeSpecificConfig.pattern, "i");
    }

    async loadRelevantMemories(
        chatSource: string,
        botName: string,
        socialContext: string,
        message: string
    ): Promise<MemoryEntry[]> {
        const memoriesFilePath = await this.getMemoriesFilePath(botName, socialContext);
        const memories = await this.getStoredMemoriesOrEmptyList(memoriesFilePath);
        return memories.map((memory) => {
            return {
                bot: botName,
                chatSource: chatSource,
                socialContext: socialContext,
                message: memory,
            };
        });
    }

    /**
     * Save the given message if it matches the pattern. Also trims whitespace.
     * For example "Remember: I like pizza" would be saved as "I like pizza" if the pattern is "Remember:(.*)"
     */
    async maybeSaveMemory(
        chatSource: string,
        botName: string,
        socialContext: string,
        sender: string | null,
        message: string
    ): Promise<boolean> {
        const match = message.match(this.pattern);
        if (!match) {
            return false;
        }
        const memory = match[1].trim();
        await this.saveMemory(sender, memory, botName, socialContext);
        console.log(`${this.name} saved memory for context ${socialContext}: ${memory}`);
        return true;
    }

    /**
     * Saves the given memory to a memory file named based on the bot name and social context.
     * Creates the file if it didn't already exist.
     */
    private async saveMemory(sender: string | null, memory: string, botName: string, socialContext: string) {
        const memoriesFilePath = await this.getMemoriesFilePath(botName, socialContext);

        const senderString = sender ? `[${sender}]: ` : "";

        const memories = await this.getStoredMemoriesOrEmptyList(memoriesFilePath);
        memories.push(senderString + memory);
        await saveJsonFile(memories, memoriesFilePath);
    }

    private async getStoredMemoriesOrEmptyList(memoriesFilePath: string): Promise<Array<string>> {
        if (await fileExists(memoriesFilePath)) {
            const fileContent = await fs.readFile(memoriesFilePath, "utf8");
            try {
                return JSON.parse(fileContent) as Array<string>;
            } catch (error) {
                throw `Failed to parse memories file at ${memoriesFilePath}. Error: ${error}`;
            }
        } else {
            return new Array<string>();
        }
    }

    private async getMemoriesFilePath(botName: string, socialContext: string) {
        const fileName = `memories-${botName}-${socialContext}`;
        const memoriesFilePath = path.join(this.memoriesFolder, sanitizeFilename(fileName) + ".json");

        await createFolderIfItDoesntAlreadyExist(this.memoriesFolder);
        return memoriesFilePath;
    }
}

async function saveJsonFile(memories: Array<string>, filePath: string) {
    await fs.writeFile(filePath, JSON.stringify(memories, null, 2), "utf-8");
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9_\-]/gi, "_");
}

async function createFolderIfItDoesntAlreadyExist(folderPath: string) {
    try {
        await fs.mkdir(folderPath, { recursive: true });
    } catch (error) {
        throw `Could not create folder at ${folderPath}. Error: ${error}`;
    }
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        return false;
    }
}
