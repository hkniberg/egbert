import { OpenAiResponseGeneratorConfig } from '../config';
import { OllamaResponseGeneratorConfig } from '../config';
import { ResponseGeneratorConfig } from '../config';
import { ResponseGenerator } from './response-generator';
import { OpenAiResponseGenerator } from './openai-response-generator';
import { OllamaResponseGenerator } from './ollama-response-generator';
import { EchoResponseGenerator } from './echo-response-generator';

function createResponseGenerator(responseGeneratorConfig: ResponseGeneratorConfig): ResponseGenerator {
    if (responseGeneratorConfig.type === 'openai') {
        return new OpenAiResponseGenerator(responseGeneratorConfig.typeSpecificConfig as OpenAiResponseGeneratorConfig);
    } else if (responseGeneratorConfig.type === 'ollama') {
        return new OllamaResponseGenerator(responseGeneratorConfig.typeSpecificConfig as OllamaResponseGeneratorConfig);
    } else if (responseGeneratorConfig.type === 'echo') {
        return new EchoResponseGenerator();
    } else {
        throw 'Unknown response generator type: ' + responseGeneratorConfig.type;
    }
}

export function createResponseGenerators(responseGeneratorConfigs: Array<ResponseGeneratorConfig>) {
    const responseGenerators: Map<string, ResponseGenerator> = new Map();
    for (const responseGeneratorConfig of responseGeneratorConfigs) {
        responseGenerators.set(responseGeneratorConfig.name, createResponseGenerator(responseGeneratorConfig));
    }
    return responseGenerators;
}



