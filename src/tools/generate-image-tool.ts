import { OpenAI } from "openai";
import { GenerateImageToolConfig } from '../config';
import { Tool } from "./tool";


type GenerateImageArgs = {
    prompt: string;
    wide: boolean;
};

export class GenerateImage implements Tool {
    public static readonly TOOL_NAME = "generate_image";
    private openai: OpenAI;

    constructor(config: GenerateImageToolConfig) {
        this.openai = new OpenAI({
            apiKey: config.apiKey,
        });
    }

    async use(
        sendStatusToClient: (activity: string) => void,
        { prompt, wide }: GenerateImageArgs,
    ): Promise<string> {
        const size = wide ? "1792x1024" : "1024x1024";
        const imageResponse = await this.openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            size: size,
        });
        sendStatusToClient("Generating image...");
        return imageResponse.data[0].url!;
    }

    definition = {
        name: GenerateImage.TOOL_NAME,
        description: "Generates an image and returns a url to it",
        parameters: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "The query to generate the image from, for example 'a flying pig'",
                },
                wide: {
                    type: "boolean",
                    description: "true if the image should be wide aspect ratio. Default is false. ",
                },
            },
            required: ["prompt"],
        },
    };
}