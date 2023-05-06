import * as fs from 'fs/promises';
const path = require('path');

export async function loadMemories(
    botName: string,
    socialContext: string,
    memoriesFolder: string | null,
): Promise<Array<string>> {
    if (!memoriesFolder) {
        return [];
    }
    const memoriesFilePath = await getMemoriesFilePath(botName, socialContext, memoriesFolder);
    return getStoredMemoriesOrEmptyList(memoriesFilePath);
}

export async function saveMemory(memory: string, botName: string, socialContext: string, memoriesFolder: string) {
    const memoriesFilePath = await getMemoriesFilePath(botName, socialContext, memoriesFolder);

    const memories = await getStoredMemoriesOrEmptyList(memoriesFilePath);
    memories.push(memory);
    saveMemoryFile(memories, memoriesFilePath);
}

async function getStoredMemoriesOrEmptyList(memoriesFilePath: string): Promise<Array<string>> {
    if (await fileExists(memoriesFilePath)) {
        const fileContent = await fs.readFile(memoriesFilePath, 'utf8');
        try {
            return JSON.parse(fileContent) as Array<string>;
        } catch (error) {
            throw `Failed to parse memories file at ${memoriesFilePath}. Error: ${error}`;
        }
    } else {
        return new Array<string>();
    }
}

function saveMemoryFile(memories: Array<String>, memoriesFilePath: string) {
    fs.writeFile(memoriesFilePath, JSON.stringify(memories, null, 2), 'utf-8');
}

function sanitizeFilename(name: string): string {
    return name.replace(/[^a-z0-9_\-]/gi, '_');
}

async function getMemoriesFilePath(botName: string, socialContext: string, memoriesFolder: string) {
    const fileName = `memories-${botName}-${socialContext}`;
    const memoriesFilePath = path.join(memoriesFolder, sanitizeFilename(fileName) + '.json');

    await createFolderIfItDoesntAlreadyExist(memoriesFolder);
    return memoriesFilePath;
}

async function createFolderIfItDoesntAlreadyExist(memoriesFolder: string) {
    try {
        await fs.mkdir(memoriesFolder, { recursive: true });
    } catch (error) {
        throw `Could not create memories folder at ${memoriesFolder}. Error: ${error}`;
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
