import { describe, expect, test } from 'vitest';
import { getCaretCoordinates } from './caretPosition';

describe('getCaretCoordinates', () => {
    test('returns numeric top/left/height without throwing', () => {
        const textarea = document.createElement('textarea');
        textarea.value = 'Hello @world';
        document.body.appendChild(textarea);

        const coordinates = getCaretCoordinates(textarea, 6);

        expect(typeof coordinates.top).toBe('number');
        expect(typeof coordinates.left).toBe('number');
        expect(typeof coordinates.height).toBe('number');

        document.body.removeChild(textarea);
    });

    test('cleans up the mirror element it creates', () => {
        const textarea = document.createElement('textarea');
        textarea.value = 'Hello';
        document.body.appendChild(textarea);

        getCaretCoordinates(textarea, 2);

        expect(document.querySelectorAll('div').length).toBe(0);

        document.body.removeChild(textarea);
    });
});
