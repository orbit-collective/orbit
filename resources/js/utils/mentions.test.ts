import { AssignableUser } from '@/types/Users';
import { describe, expect, test } from 'vitest';
import {
    applyRangeEdit,
    filterUsersByMention,
    findActiveMention,
    MentionRange,
    splitMentionText,
    tokenizeMentionRanges,
} from './mentions';

const users: AssignableUser[] = [
    { id: 1, name: 'Jane Cooper' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'Bob' },
];

describe('findActiveMention', () => {
    test('detects an in-progress mention at the start of the text', () => {
        expect(findActiveMention('@ja', 3)).toEqual({ query: 'ja', start: 0 });
    });

    test('detects an in-progress mention after whitespace', () => {
        expect(findActiveMention('Hi @ja', 6)).toEqual({
            query: 'ja',
            start: 3,
        });
    });

    test('detects a two-word in-progress query', () => {
        expect(findActiveMention('Hi @Jane Co', 11)).toEqual({
            query: 'Jane Co',
            start: 3,
        });
    });

    test('returns null when the cursor is not inside a mention', () => {
        expect(findActiveMention('Hello world', 11)).toBeNull();
    });

    test('returns null for an email-like "@" not preceded by whitespace', () => {
        expect(findActiveMention('foo@bar', 7)).toBeNull();
    });

    test('returns null once a newline separates the "@" from the cursor', () => {
        expect(findActiveMention('@ja\nmore text', 13)).toBeNull();
    });

    test('returns an empty query for a bare "@"', () => {
        expect(findActiveMention('@', 1)).toEqual({ query: '', start: 0 });
    });
});

describe('filterUsersByMention', () => {
    test('returns the first few users for an empty query', () => {
        expect(filterUsersByMention(users, '')).toEqual(users);
    });

    test('filters case-insensitively by substring', () => {
        expect(filterUsersByMention(users, 'jane')).toEqual([
            users[0],
            users[1],
        ]);
    });

    test('returns an empty array when nothing matches', () => {
        expect(filterUsersByMention(users, 'zzz')).toEqual([]);
    });
});

describe('applyRangeEdit', () => {
    test('keeps a range untouched when the edit happens entirely after it', () => {
        // "@Bob" (0-4), then the user appends "!" at the end (edit at 7-7).
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
        ];

        expect(applyRangeEdit(ranges, 7, 7, 1)).toEqual(ranges);
    });

    test('shifts a range forward when text is inserted before it', () => {
        // "Hi " (0-3) grows to "Hi there " (0-9): a pure insertion at 3-3.
        const ranges: MentionRange[] = [
            { start: 3, length: 4, userId: 3, name: 'Bob' },
        ];

        expect(applyRangeEdit(ranges, 3, 3, 6)).toEqual([
            { start: 9, length: 4, userId: 3, name: 'Bob' },
        ]);
    });

    test('shifts a range forward when another mention is inserted immediately before it', () => {
        // Regression case: the inserted text ("@Jane Cooper ") and the
        // existing range ("@Bob") both start with "@" - a naive text diff
        // can misjudge this boundary, but an exact edit can't.
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
        ];

        expect(applyRangeEdit(ranges, 0, 0, 13)).toEqual([
            { start: 13, length: 4, userId: 3, name: 'Bob' },
        ]);
    });

    test('drops a range whose text was edited', () => {
        // "@Bob" (0-4) had its middle replaced (1 char removed at 2-3).
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
        ];

        expect(applyRangeEdit(ranges, 2, 3, 0)).toEqual([]);
    });

    test('keeps one range and shifts another edited elsewhere', () => {
        // "@Bob said hi @Jane Cooper" -> "@Bob said hello @Jane Cooper":
        // "hi" (10-12) became "hello" (10-15), a net +3 insertion.
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
            { start: 13, length: 12, userId: 1, name: 'Jane Cooper' },
        ];

        expect(applyRangeEdit(ranges, 10, 12, 5)).toEqual([
            { start: 0, length: 4, userId: 3, name: 'Bob' },
            { start: 16, length: 12, userId: 1, name: 'Jane Cooper' },
        ]);
    });

    test('returns the ranges unchanged when there are none to adjust', () => {
        expect(applyRangeEdit([], 0, 0, 5)).toEqual([]);
    });
});

describe('tokenizeMentionRanges', () => {
    test('replaces a tracked range with an id-carrying token', () => {
        const ranges: MentionRange[] = [
            { start: 3, length: 12, userId: 42, name: 'Jane Cooper' },
        ];

        expect(tokenizeMentionRanges('Hi @Jane Cooper!', ranges)).toBe(
            'Hi @[Jane Cooper](42)!',
        );
    });

    test('handles multiple ranges without corrupting offsets', () => {
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
            { start: 9, length: 12, userId: 42, name: 'Jane Cooper' },
        ];

        expect(tokenizeMentionRanges('@Bob and @Jane Cooper, hi', ranges)).toBe(
            '@[Bob](3) and @[Jane Cooper](42), hi',
        );
    });

    test('returns the body unchanged when there are no ranges', () => {
        expect(tokenizeMentionRanges('Hello world', [])).toBe('Hello world');
    });
});

describe('splitMentionText', () => {
    test('returns the whole body as plain text when there are no mention tokens', () => {
        expect(splitMentionText('Hello world', users)).toEqual([
            { type: 'text', value: 'Hello world' },
        ]);
    });

    test('splits out a mention token and resolves it by id', () => {
        expect(
            splitMentionText('Hi @[Jane Cooper](1), thanks!', users),
        ).toEqual([
            { type: 'text', value: 'Hi ' },
            {
                type: 'mention',
                value: '@Jane Cooper',
                userId: 1,
                name: 'Jane Cooper',
                avatar: undefined,
            },
            { type: 'text', value: ', thanks!' },
        ]);
    });

    test('disambiguates two users sharing a name by the id in the token', () => {
        const duplicateNamed: AssignableUser[] = [
            { id: 5, name: 'Jane Cooper', avatar: '/five.jpg' },
            { id: 9, name: 'Jane Cooper', avatar: '/nine.jpg' },
        ];

        const segments = splitMentionText(
            '@[Jane Cooper](9) hi',
            duplicateNamed,
        );

        expect(segments[0]).toMatchObject({ userId: 9, avatar: '/nine.jpg' });
    });

    test('falls back to the name captured in the token when the user is unknown', () => {
        expect(splitMentionText('Hi @[Old Member](999)', [])).toEqual([
            { type: 'text', value: 'Hi ' },
            {
                type: 'mention',
                value: '@Old Member',
                userId: 999,
                name: 'Old Member',
                avatar: undefined,
            },
        ]);
    });

    test('leaves plain "@Name" text (no token) unhighlighted', () => {
        expect(splitMentionText('Reach me at @nobody', users)).toEqual([
            { type: 'text', value: 'Reach me at @nobody' },
        ]);
    });
});
