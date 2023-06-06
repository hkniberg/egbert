import { ChatSource } from './chat-source';
import { Bot } from '../bot';
import { SlackChatSourceConfig } from '../config';
import { App, KnownEventFromType } from '@slack/bolt';
import { ChatMessage } from '../response-generators/response-generator';

/**
 * https://api.slack.com/reference
 */
export class SlackChatSource extends ChatSource {
    private readonly typeSpecificConfig: SlackChatSourceConfig;
    private app: App;
    private ignoreMessagesFrom: string[] = [];

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

            const sender = await this.getUserDisplayName(message.user);

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
                await client.chat.postMessage({
                    channel: message.channel,
                    text: responseMessage,
                });
            }
        });

        (async () => {
            await this.app.start();
            console.log(`⚡️ Slack chat source '${this.name}' is running!`);
        })();
    }

    async getUserDisplayName(userId: string): Promise<string> {
        const result = await this.app.client.users.info({ user: userId });
        if (result.ok) {
            return result.user?.profile?.display_name || result.user?.profile?.real_name || result.user?.name || userId;
        } else {
            console.error('Error retrieving user info: ', result.error);
            return '';
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
                    // Slack chat messages don't include the sender's name, so we have to look it up
                    const senderName = message.user ? await this.getUserDisplayName(message.user) : null;
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
}
