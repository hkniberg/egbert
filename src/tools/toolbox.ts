import { Tool } from "./tool";

/**
 * A Toolbox is a collection of tools that can be used by GPT.
 */
export class Toolbox {
    private tools: Map<string, Tool>;

    constructor(tools: Tool[] = []) {
        this.tools = new Map<string, Tool>();
        tools.forEach((tool) => this.addTool(tool));
    }

    /**
     * Adds a tool to the toolbox.
     * @param tool The tool to add.
     */
    addTool(tool: Tool): void {
        if (this.tools.has(tool.definition.name)) {
            throw new Error(`Tool with name ${tool.definition.name} already exists.`);
        }
        this.tools.set(tool.definition.name, tool);
    }

    getSmallerToolbox(toolNames: string[]) {
        const smallerToolbox = new Toolbox();
        for (const toolName of toolNames) {
            smallerToolbox.addTool(this.getTool(toolName));
        }
        return smallerToolbox;
    }

    /**
     * Retrieves a tool by its name.
     * @param name The name of the tool to retrieve.
     * @returns The tool with the given name.
     */
    getTool(name: string): Tool {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool with name ${name} does not exist.`);
        }
        return tool;
    }

    /**
     * Returns an array of all tool definitions.
     * @returns An array of tool definitions.
     */
    getToolDefinitions(): any[] {
        return Array.from(this.tools.values()).map((tool) => tool.definition);
    }
}
