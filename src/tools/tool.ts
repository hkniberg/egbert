import { FunctionDefinition } from "openai/resources/index.mjs";

/**
 * A tool is something that can be passed to
 * GPT and triggered by GPT.
 */
export interface Tool {
   /**
    * Runs the tool with the given arguments.
    * @param args This should match that's in the definition.
    * @returns Any information that GPT might need after running the tool.
    */
   use(sendStatusToClient: (activity: string) => void, args: any): Promise<any>;

   /**
    * JSON describing the tool, what it does, params, etc.
    * GPT uses this to detect when to use a tool.
    */
   definition: FunctionDefinition;
}
