import { App, KnownEventFromType } from "@slack/bolt";
import { Message } from "@slack/web-api/dist/response/ConversationsHistoryResponse";
import NodeCache from "node-cache";
import { Bot } from "../bot";
import { SlackChatSourceConfig } from "../config";
import { ChatMessage } from "../response-generators/response-generator";
import { ChatSource } from "./chat-source";

const DEFAULT_USER_NAME_CACHE_SECONDS = 60 * 10;
const DEFAULT_START_THREAD = true;

/**
 * https://api.slack.com/reference
 */
export class SlackChatSource extends ChatSource {
    private readonly typeSpecificConfig: SlackChatSourceConfig;
    private app: App;
    private ignoreMessagesFrom: string[] = [];
    private botId: string | null = null; // for example U057Q8JQ204
    private readonly userNameCache: NodeCache;
    private readonly startThread;

    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        crossReferencePattern: string | null,
        typeSpecificConfig: SlackChatSourceConfig
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength, crossReferencePattern);
        this.app = new App({
            token: typeSpecificConfig.botToken,
            signingSecret: typeSpecificConfig.signingSecret,
            appToken: typeSpecificConfig.appToken,
            socketMode: true,
        });
        this.maxChatHistoryLength = maxChatHistoryLength;
        this.typeSpecificConfig = typeSpecificConfig;
        const userNameCacheSeconds = typeSpecificConfig.userNameCacheSeconds || DEFAULT_USER_NAME_CACHE_SECONDS;
        this.userNameCache = new NodeCache({ stdTTL: userNameCacheSeconds });
        this.startThread = typeSpecificConfig.thread == undefined ? DEFAULT_START_THREAD : typeSpecificConfig.thread;
        console.log("Slack chat source created: ", this.name);
    }

    addBot(bot: Bot) {
        this.ignoreMessagesFrom.push(bot.getName().toLowerCase());

        if (bot.getName() == this.typeSpecificConfig.bot) {
            super.addBot(bot);
        }
    }

    start(): void {
        if (!this.defaultSocialContext) {
            console.log("Warning: SlackChatSource has no default social context, so it won't do anything");
            return;
        }

        const bot = this.bots.find((bot) => bot.getName() == this.typeSpecificConfig.bot);
        if (!bot) {
            throw new Error(`Bot '${this.typeSpecificConfig.bot}' not found for slack chat source ${this.name}`);
        }

        this.app.message(/.*/, async ({ message, client }) => {
            if (message.type != "message" || !("text" in message) || !("user" in message)) {
                return;
            }

            const incomingMessage = message.text;
            console.log(`Slack chat source '${this.name}' received message:\n${incomingMessage}`);

            if (!incomingMessage) {
                return;
            }

            if (!message.user) {
                console.log(`Slack chat source '${this.name}': Ignoring message because it has no user`);
                return;
            }

            const sender = await this.getUserName(message.user);

            if (this.ignoreMessagesFrom.includes(sender)) {
                console.log(`Slack chat source '${this.name}': Ignoring message because it is from '${sender}'`);
                return;
            }

            const incomingMessageWithRealUserNames = await this.replaceUserIdsWithRealNames(incomingMessage);

            let socialContext = this.defaultSocialContext as string;
            if (!bot.willRespond(socialContext, incomingMessageWithRealUserNames)) {
                console.log(`${bot.getName()} does not want to respond to this message`);
                return;
            }

            const onMessageRemembered = async () => {
                if (this.typeSpecificConfig.rememberEmoji) {
                    await client.reactions.add({
                        name: this.typeSpecificConfig.rememberEmoji,
                        channel: message.channel,
                        timestamp: message.ts,
                    });
                }
            };

            const chatHistory = await this.loadSlackChatHistory(message, this.maxChatHistoryLength);

            const responseMessage = await bot.generateResponse(
                this.name,
                socialContext,
                sender,
                incomingMessageWithRealUserNames,
                chatHistory,
                onMessageRemembered
            );
            if (responseMessage) {
                console.log(`[${this.name} ${socialContext}] ${bot.getName()}: ${responseMessage}`);
                if (this.startThread) {
                    // always respond in a thread (create a new thread if necessary)
                    await client.chat.postMessage({
                        channel: message.channel,
                        text: responseMessage,
                        thread_ts: message.ts,
                    });
                } else {
                    // only respond in a thread if the message was already in a thread
                    await client.chat.postMessage({
                        channel: message.channel,
                        text: responseMessage,
                        thread_ts: "thread_ts" in message ? message.thread_ts : undefined,
                    });
                }
            }
        });

        (async () => {
            await this.app.start();
            console.log(`⚡️ Slack chat source '${this.name}' is running!`);
        })();
    }

    /**
     * Get the display name of a user. Use the cached value if available,
     * otherwise retrieve it from the Slack API.
     */
    async getUserName(userId: string): Promise<string> {
        const cachedUserName = this.userNameCache.get(userId);
        if (cachedUserName) {
            return cachedUserName as string;
        }

        const result = await this.app.client.users.info({ user: userId });
        if (result.ok) {
            let userName =
                result.user?.profile?.display_name || result.user?.profile?.real_name || result.user?.name || userId;
            this.userNameCache.set(userId, userName);
            return userName;
        } else {
            console.error("Error retrieving user info from Slack API: ", result.error);
            return "";
        }
    }

    async loadBotIdIfMissing() {
        if (!this.botId) {
            const result = await this.app.client.auth.test();
            if (!result.ok) {
                throw new Error(`Error retrieving bot id: ${result.error}`);
            }
            if (!result.bot_id) {
                console.log(result);
                throw new Error(`Error retrieving bot id: no bot id in response`);
            }
            this.botId = result.bot_id;
        }
    }

    async loadSlackChatHistory(
        slackMessage: KnownEventFromType<"message">,
        maxChatHistoryLength: number
    ): Promise<ChatMessage[]> {
        if (maxChatHistoryLength === 0) {
            return [];
        }

        // Get the channel id from the incoming message
        const channel = slackMessage.channel;

        let messages: Message[] | undefined;
        if ("thread_ts" in slackMessage && slackMessage.thread_ts) {
            // This is a thread message, so we will use the thread replies as history
            let repliesOptions = {
                channel: channel,
                ts: slackMessage.thread_ts, // timestamp of message that started the thread
                inclusive: false, // false to not include the message with latest timestamp
            };
            // TODO handle pagination and also ovoid breaking the token limit

            const result = await this.app.client.conversations.replies(repliesOptions);

            // remove the last message if it is the same as the incoming message
            if (result.messages && result.messages[result.messages.length - 1].ts == slackMessage.ts) {
                result.messages.pop();
            }

            messages = result.messages; // conversations.replies returns oldest messages first, so no need to reverse
        } else {
            let historyOptions = {
                channel: channel,
                limit: maxChatHistoryLength,
                latest: slackMessage.ts, // timestamp of the message
                inclusive: false, // false to not include the message with latest timestamp
            };
            const result = await this.app.client.conversations.history(historyOptions);

            messages = result.messages;
            messages?.reverse(); // conversations.history returns newest messages first, so we reverse the order
        }

        if (messages) {
            // The Slack API returns the messages in chronological order, just like we want
            return await Promise.all(
                messages.map(async (message) => {
                    let senderName = await this.getSenderNameFromSlackMessage(message);
                    console.log(`senderName: ${senderName}, message: ${message.text}`);
                    return {
                        sender: senderName,
                        message: message.text ? await this.replaceUserIdsWithRealNames(message.text) : "",
                    };
                })
            );
        } else {
            return [];
        }
    }

    private async getSenderNameFromSlackMessage(message: Message) {
        await this.loadBotIdIfMissing();
        if (message.bot_id === this.botId) {
            return this.typeSpecificConfig.bot;
        } else {
            return message.user ? await this.getUserName(message.user) : null;
        }
    }

    /**
     * When someone writes 'Hi @Henrik' in slack, that shows up as 'Hi <@U12345678>' in the message text.
     * This method replaces the user id with the user's real name, for example: 'Hi Henrik'.
     */
    private async replaceUserIdsWithRealNames(incomingMessage: string) {
        let matches = incomingMessage.match(/<@([A-Z0-9]+)>/g);
        if (!matches) {
            return incomingMessage;
        }

        for (let match of matches) {
            let userId = match.substring(2, match.length - 1);
            let userName = await this.getUserName(userId);
            incomingMessage = incomingMessage.replace(match, userName);
        }

        return incomingMessage;
    }
}
