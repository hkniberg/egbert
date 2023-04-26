import {ChatSource} from "./chat-source";
import {Bot} from "../bot";

export class ConsoleChatSource extends ChatSource {
    start(): void {
        const stdin = process.openStdin();
        stdin.addListener('data', async (incomingMessage) => {
            // send the message to each bot, and then each bot decides whether or not to respond
            // for example depending on if the message contains the bot's name.
            for (const bot of this.bots) {
                const responseMessage = await bot.generateResponse(incomingMessage);
                if (responseMessage) {
                    console.log(bot.getName() + ": " + responseMessage);
                }
            }
        });
    }
}