function splitStringAtNewline(inputString, maxLength) {
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

module.exports = {
    splitStringAtNewline,
};