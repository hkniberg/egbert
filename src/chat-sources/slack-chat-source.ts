import { ChatSource } from './chat-source';
import { Bot } from '../bot';
import { SlackChatSourceConfig } from '../config';
import { App, KnownEventFromType } from '@slack/bolt';
import { ChatMessage } from '../response-generators/response-generator';
import { Message } from '@slack/web-api/dist/response/ConversationsHistoryResponse';
import * as NodeCache from 'node-cache'

const DEFAULT_USER_NAME_CACHE_SECONDS = 60 * 10;

/**
 * https://api.slack.com/reference
 */
export class SlackChatSource extends ChatSource {
    private readonly typeSpecificConfig: SlackChatSourceConfig;
    private app: App;
    private ignoreMessagesFrom: string[] = [];
    private botId: string | null = null; // for example U057Q8JQ204
    private readonly userNameCache: NodeCache;

    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        crossReferencePattern: string | null,
        typeSpecificConfig: SlackChatSourceConfig,
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
        console.log('Slack chat source created: ', this.name);
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
            if (message.type != 'message' || !('text' in message) || !('user' in message)) {
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

            let socialContext = this.defaultSocialContext as string;
            if (!bot.willRespond(socialContext, incomingMessage)) {
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
                incomingMessage,
                chatHistory,
                onMessageRemembered,
            );
            if (responseMessage) {
                console.log(`[${this.name} ${socialContext}] ${bot.getName()}: ${responseMessage}`);
                if (this.typeSpecificConfig.thread) {
                    // always respond in a thread (create a new thread if necessary)
                    await client.chat.postMessage({
                        channel: message.channel,
                        text: responseMessage,
                        thread_ts: message.ts,
                    });
                } else {
                    // only respond if the message was already in a thread
                    await client.chat.postMessage({
                        channel: message.channel,
                        text: responseMessage,
                        thread_ts: ('thread_ts' in message) ? message.thread_ts : undefined,
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
            let userName = result.user?.profile?.display_name || result.user?.profile?.real_name || result.user?.name || userId;
            this.userNameCache.set(userId, userName);
            return userName;
        } else {
            console.error('Error retrieving user info from Slack API: ', result.error);
            return '';
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
        slackMessage: KnownEventFromType<'message'>,
        maxChatHistoryLength: number,
    ): Promise<ChatMessage[]> {
        if (maxChatHistoryLength === 0) {
            return [];
        }

        // Get the channel id from the incoming message
        const channel = slackMessage.channel;

        const result = await this.app.client.conversations.history({
            channel: channel,
            limit: maxChatHistoryLength,
            latest: slackMessage.ts, // timestamp of the message
            inclusive: false, // false to not include the message with latest timestamp
        });

        let messages = result.messages;
        if (messages) {
            // The Slack API returns the messages in chronological order, just like we want
            let chatMessages = await Promise.all(
                messages.map(async (message) => {
                    let senderName = await this.getSenderNameFromSlackMessage(message);
                    console.log(`senderName: ${senderName}, message: ${message.text}`);
                    return {
                        sender: senderName,
                        message: message.text ? message.text : '',
                    };
                }),
            );
            // reverse the array, since slack responds with newest messages first and we want oldest first
            return chatMessages.reverse();
        } else {
            return [];
        }
    }

    private async getSenderNameFromSlackMessage(message: Message) {
        await this.loadBotIdIfMissing();
        if (message.bot_id === this.botId) {
            return this.typeSpecificConfig.bot;
        } else {
            return message.user ? await this.getUserName(message.user) : null
        }
    }
}
