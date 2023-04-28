import {ChatSource} from "./chat-source";

export class ConsoleChatSource extends ChatSource {
    start(): void {
        if (!this.defaultSocialContext) {
            console.log("Warning: ConsoleChatSource has no default social context, so it won't do anything");
            return;
        }

        const stdin = process.openStdin();
        stdin.addListener('data', async (incomingMessage) => {
            // send the message to each bot, and then each bot decides whether or not to respond
            // for example depending on if the message contains the bot's name.
            for (const bot of this.bots) {
                // for some reason incomingMessage is a character buffer or something like that,
                // so we convert it to string before sending it to the bot
                const incomingMessageAsTrimmedString = ("" + incomingMessage).trim();
                const responseMessage = await bot.generateResponse(this.defaultSocialContext as string, incomingMessageAsTrimmedString);
                if (responseMessage) {
                    console.log(`[${this.defaultSocialContext as string}] ${bot.getName()}: ${responseMessage}`);
                }
            }
        });
    }
}