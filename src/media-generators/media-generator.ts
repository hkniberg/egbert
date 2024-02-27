import escapeRegExp from "lodash.escaperegexp";

export interface MediaGenerator {
    getKeyword(): string;
    generateMediaUrl(query: string): Promise<string | null>;
}

export async function replaceMediaPromptWithMediaUrlFormattedAsMarkdown(
    mediaGenerators: MediaGenerator[],
    message: string
): Promise<string> {
    for (let generator of mediaGenerators) {
        let keyword = escapeRegExp(generator.getKeyword());
        let pattern = new RegExp(`${keyword}\\[([^\\]]+)`, "g"); // Create a regex pattern for this media generator

        let matches = Array.from(message.matchAll(pattern));
        let promises = matches.map((match) => generator.generateMediaUrl(match[1]));
        let results = await Promise.all(promises);

        for (let i = 0; i < matches.length; i++) {
            try {
                let replacement = `![${matches[i][1]}](${results[i]})`;
                message = message.replace(`${generator.getKeyword()}[${matches[i][1]}]`, replacement);
            } catch (exc) {
                console.log(`Generated an exception: ${exc}`);
            }
        }
    }

    return message;
}

export async function splitMessageByMedia(
    mediaGenerators: MediaGenerator[],
    message: string
): Promise<(string | null)[]> {
    let segments: (string | null)[] = [];
    let lastEnd = 0; // Initialize lastEnd outside the loop

    for (let generator of mediaGenerators) {
        let keyword = escapeRegExp(generator.getKeyword());

        let pattern = new RegExp(`${keyword}\\[([^\\]]+)\\]`, "g");

        let promises: Promise<string | null>[] = [];
        let positions: number[] = [];

        let match;
        while ((match = pattern.exec(message)) !== null) {
            let mediaPrompt = match[1];
            let textSegment = message.slice(lastEnd, match.index).trim();
            if (textSegment) {
                segments.push(textSegment);
            }

            segments.push(null);
            promises.push(generator.generateMediaUrl(mediaPrompt).catch((err) => {
                console.log(`Error generating media URL: ${err}`);
                return "(failed to generate media)";
            }));
            positions.push(segments.length - 1);

            lastEnd = pattern.lastIndex; // Update lastEnd for each match
        }

        let results = await Promise.all(promises);
        for (let i = 0; i < results.length; i++) {
            try {
                segments[positions[i]] = results[i];
            } catch (exc) {
                console.log(`Generated an exception: ${exc}`);
            }
        }
    }

    let finalTextSegment = message.slice(lastEnd).trim(); // Move this line outside the loop
    if (finalTextSegment) {
        // Check and append finalTextSegment outside the loop
        segments.push(finalTextSegment);
    }

    return segments;
}
