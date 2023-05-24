import { ChatSource } from './chat-source';
import { Bot } from '../bot';
import { SlackChatSourceConfig } from '../config';
import { App } from '@slack/bolt';

export class SlackChatSource extends ChatSource {
    private readonly typeSpecificConfig: SlackChatSourceConfig;
    private app: App;
    private ignoreMessagesFrom: string[] = [];

    constructor(
        name: string,
        defaultSocialContext: string | null,
        maxChatHistoryLength: number,
        typeSpecificConfig: SlackChatSourceConfig,
    ) {
        super(name, defaultSocialContext, maxChatHistoryLength);
        this.app = new App({
            token: typeSpecificConfig.botToken,
            signingSecret: typeSpecificConfig.signingSecret,
            appToken: typeSpecificConfig.appToken,
            socketMode: true,
        });
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

        this.app.message(/.*/, async ({ message, say }) => {
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

            if (this.ignoreMessagesFrom.includes(message.user)) {
                console.log(`Slack chat source '${this.name}': Ignoring message because it is from '${message.user}'`);
                return;
            }

            let socialContext = this.defaultSocialContext as string;
            if (!bot.willRespond(socialContext, incomingMessage)) {
                console.log(`${bot.getName()} does not want to respond to this message`);
                return;
            }

            const responseMessage = await bot.generateResponse(
                this.name,
                socialContext,
                message.user,
                incomingMessage,
                [],
            );
            if (responseMessage) {
                console.log(`[${this.name} ${socialContext}] ${bot.getName()}: ${responseMessage}`);
                await say(`${responseMessage}`);
            }
        });

        (async () => {
            await this.app.start();
            console.log(`⚡️ Slack chat source '${this.name}' is running!`);
        })();
    }
}
