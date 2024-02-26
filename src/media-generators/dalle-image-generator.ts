import { OpenAI } from "openai";
import { DalleMediaGeneratorConfig } from "../config";
import { MediaGenerator } from "./media-generator";

export class DalleImageGenerator implements MediaGenerator {
    private openai: OpenAI;

    constructor(config: DalleMediaGeneratorConfig) {
        this.openai = new OpenAI({
            apiKey: config.apiKey,
        });
    }

    getKeyword(): string {
        return "IMAGE";
    }

    async generateMediaUrl(query: string): Promise<string | null> {
        const imageResponse = await this.openai.images.generate({
            model: "dall-e-3",
            prompt: query,
            size: "1024x1024", // could also be "1792x1024"
        });
        return imageResponse.data[0].url!;
    }
}
