/**
 * An array that has a maximum length.
 * When a new item is added to the array, if the array is at its
 * maximum length, the oldest item is removed from the array.
 */
export class CappedArray<T> {
    private readonly items: T[];
    public readonly maxLength: number;

    constructor(maxLength: number) {
        this.items = [];
        this.maxLength = maxLength;
    }

    public add(item: T): void {
        if (this.maxLength <= 0) {
            return;
        }

        if (this.items.length === this.maxLength) {
            this.items.shift();
        }
        this.items.push(item);
    }

    public addAll(messagesToAdd: T[]) {
        if (this.maxLength <= 0) {
            return;
        }
        for (const messageToAdd of messagesToAdd) {
            this.add(messageToAdd);
        }
    }

    public getAll(): T[] {
        return this.items;
    }

}
