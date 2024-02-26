import fs from "fs";
import he from "he";
import { OpenAI } from "openai";
import { Chat, ChatCompletionMessageParam } from "openai/resources/index.mjs";
import { Toolbox } from "../tools/toolbox";
import ChatCompletionCreateParamsNonStreaming = Chat.ChatCompletionCreateParamsNonStreaming;

const maxToolResponseLength = 20000;

export const emptySendChunkToClient = (chunk: string, finishReason: string | null) => {};
export const emptySendStatusToClient = (activity: string) => {
   console.log("Activity: ", activity);
};
export const emptySendToolCallMessageToClient = (toolCallMessage: Chat.ChatCompletionMessageParam) => {};

export type ModelType =
   | "gpt-4"
   | "gpt-4-1106-preview"
   | "gpt-4-0125-preview"
   | "gpt-4-turbo-preview"
   | "gpt-3.5-turbo"
   | "gpt-4-vision-preview";

const DEFAULT_MODEL = "gpt-4-0125-preview";

export class GPT {
   private openai: OpenAI;
   private defaultModel: ModelType;

   constructor(apiKey: string, defaultModel: ModelType = DEFAULT_MODEL) {
      this.openai = new OpenAI({
         apiKey: apiKey,
      });
      this.defaultModel = defaultModel;
   }

   async chat(
      messages: Array<Chat.ChatCompletionMessageParam>,
      model: ModelType = this.defaultModel,
   ): Promise<Chat.ChatCompletionMessage> {
      const params = {
         messages: messages,
         model: model,
      } as ChatCompletionCreateParamsNonStreaming;
      // TODO error handling, retrying, null handling
      console.log("calling GPT with messages: ", messages);
      const chatCompletion = await this.openai.chat.completions.create(params);
      const response = chatCompletion.choices[0].message;
      console.log("Got response: ", response);
      return response;
   }

   async simpleChat(
      systemMessage: string | null,
      userMessage: string,
      model: ModelType = this.defaultModel,
   ): Promise<string> {
      const messages = [
         { role: "system", content: systemMessage ? systemMessage : "" },
         { role: "user", content: userMessage },
      ] as Array<Chat.ChatCompletionMessageParam>;
      const result = await this.chat(messages, model);
      return result.content!;
   }

   async simpleChatJson(
      systemMessage: string | null,
      userMessage: string,
      model: ModelType = this.defaultModel,
   ): Promise<object> {
      const params = {
         messages: [
            { role: "system", content: systemMessage ? systemMessage : "" },
            { role: "user", content: userMessage },
         ],
         model: model,
         response_format: { type: "json_object" },
      } as ChatCompletionCreateParamsNonStreaming;
      console.log("calling simpleChatJson");
      console.log("system message: ", systemMessage);
      console.log("user message: ", userMessage);

      // TODO error handling, retrying, null handling
      const chatCompletion = await this.openai.chat.completions.create(params);
      const content = chatCompletion.choices[0].message.content!;
      console.log("Got response: ", content);
      return JSON.parse(content);
   }

   /**
    * Returns a short-lived image url
    */
   async generateImage(prompt: string, wide: boolean = true): Promise<string> {
      const imageResponse = await this.openai.images.generate({
         model: "dall-e-3",
         prompt: prompt,
         size: wide ? "1792x1024" : "1024x1024",
      });

      console.log("Generated image data:", imageResponse.data);
      return imageResponse.data[0].url!;
   }

   async analyzeImage(
      systemMessage: string | null,
      userMessage: string,
      imageUrl: string,
      model: ModelType = "gpt-4-vision-preview",
   ): Promise<string> {
      const params = {
         messages: [
            { role: "system", content: systemMessage ? systemMessage : "" },
            {
               role: "user",
               content: [
                  { type: "text", text: userMessage },
                  {
                     type: "image_url",
                     image_url: {
                        url: imageUrl,
                        detail: "high",
                     },
                  },
               ],
            },
         ],
         model: model,
         max_tokens: 4096,
      } as ChatCompletionCreateParamsNonStreaming;

      const chatCompletion = await this.openai.chat.completions.create(params);
      console.log("GPT response:", chatCompletion.choices[0]);
      return chatCompletion.choices[0].message.content!;
   }

   mergeToolCalls(toolCalls1: any[], toolCalls2: any[]): any[] {
      const merged = [...toolCalls1];

      toolCalls2.forEach((toolCall2) => {
         const existingIndex = merged.findIndex((tc) => tc.index === toolCall2.index);
         if (existingIndex !== -1) {
            // Ensure the function property exists in both tool calls
            if (!merged[existingIndex].function) {
               merged[existingIndex].function = {};
            }
            if (!toolCall2.function) {
               toolCall2.function = {};
            }

            // Merge the name if it exists
            if (toolCall2.function.name) {
               merged[existingIndex].function.name = toolCall2.function.name;
            }

            // Concatenate the arguments if they exist
            if (typeof toolCall2.function.arguments === "string") {
               merged[existingIndex].function.arguments =
                  (merged[existingIndex].function.arguments || "") + toolCall2.function.arguments;
            }
         } else {
            // If the tool call doesn't exist in the merged array, push it as is
            merged.push(toolCall2);
         }
      });

      return merged;
   }

   mergeChunkIntoResponse(chunk1: any, chunk2: any): any {
      //console.log("chunk1", JSON.stringify(chunk1, null, 2));
      //console.log("chunk2", JSON.stringify(chunk2, null, 2));

      // Assuming the structure of the chunks is as provided and consistent
      const mergedChoices = chunk1.choices.map((choice: any, index: number) => {
         const toolCalls1 = choice.delta.tool_calls || [];
         const toolCalls2 = chunk2.choices[index]?.delta?.tool_calls || [];
         return {
            ...choice,
            delta: {
               ...choice.delta,
               tool_calls: this.mergeToolCalls(toolCalls1, toolCalls2),
            },
         };
      });

      return {
         ...chunk1,
         choices: mergedChoices,
      };
   }

   private isFunctionCall(json: any): boolean {
      return json.choices?.some(
         (choice: any) => Array.isArray(choice.delta?.tool_calls) && choice.delta.tool_calls.length > 0,
      );
   }

   async generateResponseWithTools(
      messages: Array<Chat.ChatCompletionMessageParam>,
      toolbox: Toolbox,
      sendChunkToClient: (chunk: string, finishReason: string | null) => void = emptySendChunkToClient,
      sendStatusToClient: (activity: string) => void = emptySendStatusToClient,
      sendToolCallMessageToClient: (
         toolCallMessage: Chat.ChatCompletionMessageParam,
      ) => void = emptySendToolCallMessageToClient,
      model: ModelType = this.defaultModel,
      jsonMode: boolean = false,
   ): Promise<string> {
      sendStatusToClient("Tänker... 🧠");

      // The call to open ai will either generate an emediate response or tool call request, which we then execute, and send the original
      // chat messages + tool result back to open ai.
      // Which then can generate a new tool request, or a final response.
      // We loop until we get a final response indended for the user.

      let lastResponseMessage: string = "";
      while (true) {
         console.log("Beginning of the big and ugly generateResponseLoop", messages);

         const stream = await this.openai.chat.completions.create({
            model: model,
            messages: messages,
            stream: true,
            tools: toolbox.getToolDefinitions().map((definition) => ({
               type: "function",
               function: definition,
            })),
            tool_choice: "auto",
            ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
         });

         let funcionCallAggregate: any = null;
         let stop: string | null = null;
         for await (const chunk of stream) {
            //console.log(JSON.stringify(chunk, null, 2));
            //console.log("chunk", JSON.stringify(chunk, null, 2));
            if (this.isFunctionCall(chunk)) {
               if (funcionCallAggregate === null) {
                  funcionCallAggregate = chunk;
               } else {
                  funcionCallAggregate = this.mergeChunkIntoResponse(funcionCallAggregate, chunk);
               }
               //console.log("funcionCallAggregate", JSON.stringify(funcionCallAggregate, null, 2));
            } else {
               // Send the chunk to the client
               sendChunkToClient(chunk.choices[0]?.delta?.content || "", chunk.choices[0]?.finish_reason);
               if (chunk.choices[0]?.delta?.content) {
                  lastResponseMessage += chunk.choices[0]?.delta?.content;
               }
               stop = chunk.choices[0]?.finish_reason;
            }
         }

         console.log("lastResponseMessage", lastResponseMessage);

         if (stop === "stop") {
            console.log("Got a stop, has streamed the last response, but here it is:", lastResponseMessage);
            return lastResponseMessage;
         }

         const toolCalls = funcionCallAggregate.choices[0].delta.tool_calls || null;
         if (Array.isArray(toolCalls) && toolCalls.length > 0) {
            console.log("tool call count: ", toolCalls.length);

            sendStatusToClient(`Knåpar ihop ett svar... 🛠️`);
            funcionCallAggregate.content = "Tool call request from the assistant";
            // trim fullResponse to avoid sending too much data

            const toolCallChatMessage: ChatCompletionMessageParam = {
               role: "assistant",
               content: funcionCallAggregate.content,
               tool_calls: funcionCallAggregate.choices[0].delta.tool_calls,
            };

            messages.push(toolCallChatMessage);
            console.log(
               "Calling sendToolCallMessageToClient for the tool call: ",
               JSON.stringify(toolCallChatMessage, null, 2),
            );
            sendToolCallMessageToClient(toolCallChatMessage);
            // Create an array of promises for each tool call
            const toolCallPromises = toolCalls.map((toolCall: any) => {
               const toolName = toolCall.function.name;
               console.log(`Preparing to call tool ${toolName}`);
               const tool = toolbox.getTool(toolName); // Use toolbox to get the tool
               if (!tool) {
                  throw new Error(`Tool ${toolName} is not available`);
               }
               // Decode HTML entities in the function arguments, to handle special characters
               const functionArgs = JSON.parse(he.decode(toolCall.function.arguments));
               //console.log("function_args:", functionArgs);
               // Return the promise without awaiting here
               return tool
                  .use(sendStatusToClient, functionArgs)
                  .then((functionResponse) => {
                     // Check if the response is an object and stringify it if necessary
                     if (!functionResponse) {
                        functionResponse = "The function completed successfully.";
                     }
                     if (typeof functionResponse === "object" && functionResponse !== null) {
                        functionResponse = JSON.stringify(functionResponse);
                     }
                     // Check if the response exceeds the max length
                     if (functionResponse.length > maxToolResponseLength) {
                        console.warn(
                           `Warning: Truncating response from ${toolName} as it exceeds the max length of ${maxToolResponseLength}`,
                        );
                        functionResponse = functionResponse.substring(0, maxToolResponseLength);
                     }
                     return {
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: functionResponse || "",
                     };
                  })
                  .catch((error: Error) => {
                     console.error(
                        `Error calling tool ${toolName} with arguments ${JSON.stringify(functionArgs)}: ${error.message}`,
                     );
                     console.error(error.stack);
                     return {
                        tool_call_id: toolCall.id,
                        role: "tool",
                        content: `The tool call failed with error message '${error.message}'. Don't retry, just inform the user. ${error.message}`,
                     };
                  });
            });

            console.log("Started a tool or a few in parallell, waiting for the results");

            // Wait for all promises to resolve
            const toolResponses = await Promise.all(toolCallPromises);
            const toolMessageParams: ChatCompletionMessageParam[] = toolResponses.map((toolResponse) => ({
               ...toolResponse,
               role: "tool" as const, // Explicitly type 'role' as the literal 'tool'
            }));

            console.log("Got a tool responses, will send it back to GPT: ", toolMessageParams);

            messages.push(...toolMessageParams);
            // the weird thing here is that when GPT wants to call a tool, that is ONE message.
            // but when we send the tool responses back, it is separate messages.
            // Let's loop through those separate messages and send to the client
            toolMessageParams.forEach((toolMessageParam) => {
               console.log(
                  "Calling sendToolCallMessageToClient for a tool response: ",
                  JSON.stringify(toolMessageParam, null, 2),
               );
               sendToolCallMessageToClient(toolMessageParam);
            });

            console.log(
               "Adding toolMessageParams (= responses to tool calls): ",
               JSON.stringify(toolMessageParams, null, 2),
            );

            continue;
         }
      }
   }

   async transcribeAudio(audioFile: string): Promise<string> {
      console.log("Transcribing audio...");
      const transcription = await this.openai.audio.transcriptions.create({
         file: fs.createReadStream(audioFile),
         model: "whisper-1",
      });
      console.log("Transcription:", transcription);

      return transcription.text;
   }
}
