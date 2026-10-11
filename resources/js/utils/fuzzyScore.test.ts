import { describe, expect, test } from 'vitest';
import { fuzzyScore } from './fuzzyScore';

describe('fuzzyScore', () => {
    test('an empty query matches everything with no highlight', () => {
        expect(fuzzyScore('  ', 'Create issue')).toEqual({
            score: 0,
            ranges: [],
        });
    });

    test('returns null when a token cannot be matched', () => {
        expect(fuzzyScore('xyz', 'Create issue')).toBeNull();
        expect(fuzzyScore('create zzz', 'Create issue')).toBeNull();
    });

    test('ranks word prefix > contiguous > scattered', () => {
        const prefix = fuzzyScore('iss', 'Create issue') as { score: number };
        const contiguous = fuzzyScore('eat', 'Create issue') as {
            score: number;
        };
        const scattered = fuzzyScore('crt', 'Create issue') as {
            score: number;
        };

        expect(prefix.score).toBeGreaterThan(contiguous.score);
        expect(contiguous.score).toBeGreaterThan(scattered.score);
    });

    test('returns the ranges of the matched characters', () => {
        expect(fuzzyScore('iss', 'Create issue')?.ranges).toEqual([[7, 10]]);
        expect(fuzzyScore('crt', 'Create issue')?.ranges).toEqual([
            [0, 2],
            [4, 5],
        ]);
    });

    test('matches each whitespace-separated token independently', () => {
        const match = fuzzyScore('crt iss', 'Create issue');

        expect(match).not.toBeNull();
        expect(match?.ranges).toEqual([
            [0, 2],
            [4, 5],
            [7, 10],
        ]);
    });

    test('is case-insensitive', () => {
        expect(fuzzyScore('DASH', 'Go to dashboard')).not.toBeNull();
    });

    test('prefers a word start over a mid-word hit', () => {
        const start = fuzzyScore('set', 'Open settings') as { score: number };
        const middle = fuzzyScore('set', 'Offset value') as { score: number };

        expect(start.score).toBeGreaterThan(middle.score);
    });

    test('prefers the shorter title when matches are otherwise equal', () => {
        const short = fuzzyScore('go', 'Go home') as { score: number };
        const long = fuzzyScore('go', 'Go to the very long page') as {
            score: number;
        };

        expect(short.score).toBeGreaterThan(long.score);
    });

    test('picks the tightest scattered match', () => {
        const match = fuzzyScore('ab', 'a xxxxxx ab');

        expect(match?.ranges).toEqual([[9, 11]]);
    });
});
