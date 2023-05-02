import { CappedArray } from '../../src/util/capped-array';

describe('CappedArray', () => {
    test('Adding elements within maxLength', () => {
        const cappedArray = new CappedArray<string>(3);

        cappedArray.add('one');
        cappedArray.add('two');

        const items = cappedArray.getAll();

        expect(items.length).toBe(2);
        expect(items).toEqual(['one', 'two']);
    });

    test('Adding elements beyond maxLength and purging older elements', () => {
        const cappedArray = new CappedArray<string>(3);

        cappedArray.add('one');
        cappedArray.add('two');
        cappedArray.add('three');
        cappedArray.add('four');

        const items = cappedArray.getAll();

        expect(items.length).toBe(3);
        expect(items).toEqual(['two', 'three', 'four']);
    });
});
