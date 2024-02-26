import axios from "axios";
import { GiphyMediaGeneratorConfig } from "../config";
import { MediaGenerator } from "./media-generator";

export class GiphyGenerator implements MediaGenerator {
    giphyApiKey: string;

    constructor(config: GiphyMediaGeneratorConfig) {
        this.giphyApiKey = config.apiKey;
    }

    getKeyword(): string {
        return "GIF";
    }

    async generateMediaUrl(query: string) {
        const url = `https://api.giphy.com/v1/gifs/translate?api_key=${this.giphyApiKey}&s=${query}&limit=1`;
        try {
            const response = await axios.get(url);
            if (response.status === 200) {
                const gifUrl = response.data.data.images.original.url;
                return gifUrl;
            } else {
                console.log(`Failed to retrieve GIF: ${response.status}`);
                return null;
            }
        } catch (error) {
            console.error(`Failed to retrieve GIF: ${error}`);
            return null;
        }
    }
}
