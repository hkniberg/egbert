const fs = require("fs");
const path = require("path");

const MEMORIES_DIR_RELATIVE_TO_HERE = "../memories";

export type MemoryBank = {
    memories: string[];
    customSystemMessage: string | null;
}

export async function saveMemory(message : string, serverName : string) {
    const memoriesFolder = path.join(__dirname, MEMORIES_DIR_RELATIVE_TO_HERE);
    const sanitizedFilename = sanitizeFilename(serverName);
    const memoriesFilePath = path.join(memoriesFolder, `${sanitizedFilename}.json`);

    try {
        await fs.promises.mkdir(memoriesFolder, { recursive: true });

        let serverData;

        try {
            await fs.promises.access(memoriesFilePath);
            const fileContent = await fs.promises.readFile(memoriesFilePath, 'utf-8');
            serverData = JSON.parse(fileContent) || {};
        } catch (error) {
            console.log('No existing memories file found, creating a new one.');
            serverData = { memories: [], customSystemMessage: null };
            await fs.promises.writeFile(memoriesFilePath, JSON.stringify(serverData, null, 2), 'utf-8');
        }

        serverData.memories = serverData.memories || [];

        serverData.memories.push(message);

        await fs.promises.writeFile(memoriesFilePath, JSON.stringify(serverData, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error saving memory:', error);
    }
}

export async function loadMemories(serverName : string) : Promise<MemoryBank> {
    const sanitizedFilename = sanitizeFilename(serverName);
    const memoriesFilePath = path.join(__dirname, MEMORIES_DIR_RELATIVE_TO_HERE, `${sanitizedFilename}.json`);

    try {
        const fileContent = await fs.promises.readFile(memoriesFilePath, 'utf-8');
        const serverData = JSON.parse(fileContent);

        return {
            memories: serverData.memories || [],
            customSystemMessage: serverData.customSystemMessage || null,
        };
    } catch (error) {
        return { memories: [], customSystemMessage: null };
    }
}
function sanitizeFilename(name : string) : string {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
}