import axios from "axios";
import { MemoryEntry } from "../memory-managers/memory-manager";
import { ChatMessage, ChatSourceHistory, ResponseGenerator } from "./response-generator";

export interface HttpResponseGeneratorConfig {
    url: string;
    headers?: Record<string, string>;
    noopResponse?: string;   // if response equals this string exactly, return "" (default "-")
    timeoutMs?: number;      // default 30000
}

const DEFAULT_TIMEOUT_MS = 300000;
const DEFAULT_NOOP_RESPONSE = "-";

export class HttpResponseGenerator implements ResponseGenerator {
    private readonly config: HttpResponseGeneratorConfig;

    constructor(config: HttpResponseGeneratorConfig) {
        this.config = config;
    }

    async generateResponse(
        triggerMessage: string,
        sender: string | null,
        botName: string,
        botPrompt: string,
        chatSourcePrompt: string | null,
        memories: MemoryEntry[],
        chatHistory: ChatMessage[],
        otherChatSourceHistories: ChatSourceHistory[],
        chatSourceName: string,
        socialContext: string
    ): Promise<string> {
        const payload = {
            triggerMessage,
            sender,
            botName,
            botPrompt,
            chatSourcePrompt,
            chatSourceName,
            socialContext,
            memories,
            chatHistory,
            otherChatSourceHistories,
            timestamp: new Date().toISOString(),
        };

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            ...this.config.headers,
        };

        console.log(`HTTP POST to ${this.config.url}`, JSON.stringify(payload));

        try {
            const response = await axios.post(this.config.url, payload, {
                headers,
                timeout: this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            });

            const body = typeof response.data === "string" ? response.data : JSON.stringify(response.data);
            console.log(`HTTP POST to ${this.config.url} responded ${response.status}:`, body);

            const noopResponse = this.config.noopResponse ?? DEFAULT_NOOP_RESPONSE;
            if (body === noopResponse) {
                return "";
            }

            return body;
        } catch (error: any) {
            const status = error.response?.status;
            const data = error.response?.data;
            console.error(`HTTP POST to ${this.config.url} failed (${status}):`, data ?? error.message);
            return "";
        }
    }
}
