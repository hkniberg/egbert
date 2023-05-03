import {OpenAiResponseGeneratorConfig, ResponseGeneratorConfig} from "../config";
import {ResponseGenerator} from "./response-generator";
import {OpenAiResponseGenerator} from "./openai-response-generator";
import {EchoResponseGenerator} from "./echo-response-generator";

export function createResponseGenerator(responseGeneratorConfig: ResponseGeneratorConfig): ResponseGenerator {
    if (responseGeneratorConfig.type === "openai") {
        return new OpenAiResponseGenerator(responseGeneratorConfig.typeSpecificConfig as OpenAiResponseGeneratorConfig);
    } else if (responseGeneratorConfig.type === "echo") {
        return new EchoResponseGenerator();
    } else {
        throw("Unknown response generator type: " + responseGeneratorConfig.type);
    }
}