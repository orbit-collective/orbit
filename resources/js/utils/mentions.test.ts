import { AssignableUser } from '@/types/Users';
import { describe, expect, test } from 'vitest';
import {
    filterUsersByMention,
    findActiveMention,
    MentionRange,
    reconcileMentionRanges,
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

describe('reconcileMentionRanges', () => {
    test('keeps a range untouched when the edit happens after it', () => {
        // "@Bob " (0-4) then user keeps typing after it.
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
        ];

        const result = reconcileMentionRanges(ranges, '@Bob hi', '@Bob hi!');

        expect(result).toEqual(ranges);
    });

    test('shifts a range forward when text is inserted before it', () => {
        const oldText = 'Hi @Bob';
        const newText = 'Hi there @Bob';
        const ranges: MentionRange[] = [
            {
                start: oldText.indexOf('@Bob'),
                length: 4,
                userId: 3,
                name: 'Bob',
            },
        ];

        const result = reconcileMentionRanges(ranges, oldText, newText);

        expect(result).toEqual([
            {
                start: newText.indexOf('@Bob'),
                length: 4,
                userId: 3,
                name: 'Bob',
            },
        ]);
    });

    test('drops a range whose text was edited', () => {
        const ranges: MentionRange[] = [
            { start: 0, length: 4, userId: 3, name: 'Bob' },
        ];

        const result = reconcileMentionRanges(ranges, '@Bob hi', '@Bo hi');

        expect(result).toEqual([]);
    });

    test('keeps one range and drops another edited elsewhere', () => {
        // Edit happens between the two mentions, not touching either range.
        const oldText = '@Bob said hi @Jane Cooper';
        const newText = '@Bob said hello @Jane Cooper';

        const ranges: MentionRange[] = [
            {
                start: oldText.indexOf('@Bob'),
                length: 4,
                userId: 3,
                name: 'Bob',
            },
            {
                start: oldText.indexOf('@Jane Cooper'),
                length: 12,
                userId: 1,
                name: 'Jane Cooper',
            },
        ];

        const result = reconcileMentionRanges(ranges, oldText, newText);

        expect(result).toEqual([
            {
                start: newText.indexOf('@Bob'),
                length: 4,
                userId: 3,
                name: 'Bob',
            },
            {
                start: newText.indexOf('@Jane Cooper'),
                length: 12,
                userId: 1,
                name: 'Jane Cooper',
            },
        ]);
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
