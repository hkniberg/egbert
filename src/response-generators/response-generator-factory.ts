import { OpenAiResponseGeneratorConfig } from "../config";
import { OllamaResponseGeneratorConfig } from "../config";
import { ResponseGeneratorConfig } from "../config";
import { ResponseGenerator } from "./response-generator";
import { OpenAiResponseGenerator } from "./openai-response-generator";
import { OllamaResponseGenerator } from "./ollama-response-generator";
import { EchoResponseGenerator } from "./echo-response-generator";
import { Tool } from '../tools/tool';

function createResponseGenerator(responseGeneratorConfig: ResponseGeneratorConfig, tools: Tool[]): ResponseGenerator {
    if (responseGeneratorConfig.type === "openai") {
        return new OpenAiResponseGenerator(responseGeneratorConfig.typeSpecificConfig as OpenAiResponseGeneratorConfig, tools);
    } else if (responseGeneratorConfig.type === "ollama") {
        return new OllamaResponseGenerator(responseGeneratorConfig.typeSpecificConfig as OllamaResponseGeneratorConfig);
    } else if (responseGeneratorConfig.type === "echo") {
        return new EchoResponseGenerator();
    } else {
        throw "Unknown response generator type: " + responseGeneratorConfig.type;
    }
}

export function createResponseGenerators(responseGeneratorConfigs: Array<ResponseGeneratorConfig>, tools: Tool[]) {
    const responseGenerators: Map<string, ResponseGenerator> = new Map();
    for (const responseGeneratorConfig of responseGeneratorConfigs) {
        responseGenerators.set(responseGeneratorConfig.name, createResponseGenerator(responseGeneratorConfig, tools));
    }
    return responseGenerators;
}
