export function splitStringAtNewline(inputString: string, maxLength: number): string[] {
    const lines = inputString.split("\n");
    let result = [];
    let currentLine = "";

    for (let line of lines) {
        if (currentLine.length + line.length + 1 <= maxLength) {
            currentLine += (currentLine.length > 0 ? "\n" : "") + line;
        } else {
            result.push(currentLine);
            currentLine = line;
        }
    }

    if (currentLine.length > 0) {
        result.push(currentLine);
    }

    return result;
}

export function noEmptyString(input: string | null): string | null {
    if (input) {
        return input.trim() === "" ? null : input;
    }
    return null;
}

/**
 * Utility function to delay execution
 * @param ms Number of milliseconds to delay
 * @returns A promise to wait for
 */
export function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
