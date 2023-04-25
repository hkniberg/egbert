export function splitStringAtNewline(inputString : string, maxLength : number) : string[] {
    const lines = inputString.split('\n');
    let result = [];
    let currentLine = '';

    for (let line of lines) {
        if (currentLine.length + line.length + 1 <= maxLength) {
            currentLine += (currentLine.length > 0 ? '\n' : '') + line;
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

export function readRequiredConfigProperty(propertyName : string) : string {
    const value = process.env[propertyName];
    if (value == null || value.length === 0) {
        throw new Error(`.env is missing required property: ${propertyName}`);
    }
    return value;
}
