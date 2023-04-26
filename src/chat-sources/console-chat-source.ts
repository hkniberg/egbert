import {ChatSource} from "./chat-source";

export class ConsoleChatSource extends ChatSource {
    start(): void {
        const stdin = process.openStdin();
        stdin.addListener('data', async (incomingMessage) => {
            // send the message to each bot, and then each bot decides whether or not to respond
            // for example depending on if the message contains the bot's name.
            for (const bot of this.bots) {
                // for some reason incomingMessage is a character buffer or something like that,
                // so we convert it to string before sending it to the bot
                const incomingMessageAsString = "" + incomingMessage;
                const responseMessage = await bot.generateResponse(this.socialContext, incomingMessageAsString);
                if (responseMessage) {
                    console.log(bot.getName() + ": " + responseMessage);
                }
            }
        });
    }
}