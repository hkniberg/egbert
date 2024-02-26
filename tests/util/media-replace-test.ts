import { MediaGenerator, replaceMediaPromptWithMediaUrlFormattedAsMarkdown, splitMessageByMedia } from "../../src/media-generators/media-generator";

class FakeImageGenerator implements MediaGenerator {
    getKeyword(): string {
        return "IMAGE";
    }

    async generateMediaUrl(query: string): Promise<string | null> {
        return `https://fake.image.url/${query}.jpg`;
    }
}

class FakeGifGenerator implements MediaGenerator {
    getKeyword(): string {
        return "GIF";
    }

    async generateMediaUrl(query: string): Promise<string | null> {
        return `https://fake.gif.url/${query}.gif`;
    }
}

// Media generators
const mediaGenerators: MediaGenerator[] = [
    new FakeImageGenerator(),
    new FakeGifGenerator()
];

test('replaceMediaPromptWithMediaUrlFormattedAsMarkdown', async () => {
    const message = "Here's a fake IMAGE[cat] and a fake GIF[dance].";
    const expectedResult = "Here's a fake ![cat](https://fake.image.url/cat.jpg) and a fake ![dance](https://fake.gif.url/dance.gif).";
    const result = await replaceMediaPromptWithMediaUrlFormattedAsMarkdown(mediaGenerators, message);
    expect(result).toBe(expectedResult);
});

test('splitMessageByMedia no media', async () => {
    const message = "This is a test message with no media.";
    const expectedOutput = ["This is a test message with no media."];  // Expected output is a list with the original message
    const output = await splitMessageByMedia(mediaGenerators, message);
    expect(output).toEqual(expectedOutput);
});

test('splitMessageByMedia', async () => {
    const message = "Here's a fake IMAGE[cat] and a fake GIF[dance].";
    const expectedResult = ["Here's a fake", "https://fake.image.url/cat.jpg", "and a fake", "https://fake.gif.url/dance.gif", "."];
    const result = await splitMessageByMedia(mediaGenerators, message);
    expect(result).toEqual(expectedResult);
});