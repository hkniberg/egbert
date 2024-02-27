import fetch from 'node-fetch';
import { GetWeatherToolConfig } from "../config";
import { PersistentCache } from '../util/cache';
import { Tool } from "./tool";

type GetWeatherArgs = {
    location: string;
};

export class GetWeatherTool implements Tool {
    public static readonly TOOL_NAME = "get-weather";
    private apiKey: string;
    private cache: PersistentCache;
    private cacheTimeSeconds: number;

    constructor(config: GetWeatherToolConfig, cache: PersistentCache) {
        this.apiKey = config.apiKey;
        this.cache = cache;
        this.cacheTimeSeconds = config.cacheTimeSeconds;
    }

    async use(
        sendStatusToClient: (activity: string) => void,
        { location }: GetWeatherArgs,
    ): Promise<any> {
        const cachedWeatherData = this.cache.retrieve(location);
        if (cachedWeatherData) {
            return cachedWeatherData;
        }

        // First, get the coordinates of the location
        const geoEndpoint = `http://api.openweathermap.org/geo/1.0/direct?q=${location}&limit=1&appid=${this.apiKey}`;
        const geoResponse = await fetch(geoEndpoint);
        if (!geoResponse.ok) {
            throw new Error(`Failed to get coordinates! ${geoResponse.status}`);
        }
        const geoData = await geoResponse.json();
        const { lat, lon } = geoData[0];

        // Then, get the weather data
        const weatherEndpoint = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely&appid=${this.apiKey}`;
        const weatherResponse = await fetch(weatherEndpoint);
        if (!weatherResponse.ok) {
            throw new Error(`Failed to check weather! ${weatherResponse.status}`);
        }
        sendStatusToClient("Fetching weather data...");
        const weatherData = JSON.stringify(await weatherResponse.json());
        await this.cache.store(location, weatherData, this.cacheTimeSeconds);

        return weatherData;
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