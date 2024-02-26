import fetch from 'node-fetch';
import { GetWeatherToolConfig } from "../config";
import { Tool } from "./tool";

type GetWeatherArgs = {
    location: string;
};

export class GetWeatherTool implements Tool {
    public static readonly TOOL_NAME = "get-weather";
    private apiKey: string;

    constructor(config: GetWeatherToolConfig) {
        this.apiKey = config.apiKey;
    }

    async use(
        sendStatusToClient: (activity: string) => void,
        { location }: GetWeatherArgs,
    ): Promise<any> {
        // First, get the coordinates of the location
        const geoEndpoint = `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${this.apiKey}`;
        const geoResponse = await fetch(geoEndpoint);
        if (!geoResponse.ok) {
            throw new Error(`Failed to get coordinates! ${geoResponse.status}`);
        }
        const geoData = await geoResponse.json();
        const { lat, lon } = geoData[0];

        // Then, get the weather data
        const weatherEndpoint = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${this.apiKey}`;
        const weatherResponse = await fetch(weatherEndpoint);
        if (!weatherResponse.ok) {
            throw new Error(`Failed to check weather! ${weatherResponse.status}`);
        }
        sendStatusToClient("Fetching weather data...");
        return JSON.stringify(await weatherResponse.json());
    }

    definition = {
        name: GetWeatherTool.TOOL_NAME,
        description: "Get the current weather & forecast for a location",
        parameters: {
            type: "object",
            properties: {
                location: {
                    type: "string",
                    description: "The location, for example a city or region.",
                },
            },
            required: ["location"],
        },
    };
}