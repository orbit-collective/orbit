import { AssignableUser } from '@/types/Users';
import { describe, expect, test } from 'vitest';
import {
    filterUsersByMention,
    findActiveMention,
    splitMentionText,
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

describe('splitMentionText', () => {
    test('returns the whole body as plain text when there are no mentions', () => {
        expect(splitMentionText('Hello world', users)).toEqual([
            { type: 'text', value: 'Hello world' },
        ]);
    });

    test('splits out a mention that matches a real project member', () => {
        expect(splitMentionText('Hi @Jane Cooper, thanks!', users)).toEqual([
            { type: 'text', value: 'Hi ' },
            { type: 'mention', value: '@Jane Cooper' },
            { type: 'text', value: ', thanks!' },
        ]);
    });

    test('prefers the longer name so "@Jane Cooper" is not split as "@Jane"', () => {
        const segments = splitMentionText('cc @Jane Cooper', users);
        expect(segments).toContainEqual({
            type: 'mention',
            value: '@Jane Cooper',
        });
    });

    test('leaves an "@" that does not match any project member as plain text', () => {
        expect(splitMentionText('Reach me at @nobody', users)).toEqual([
            { type: 'text', value: 'Reach me at @nobody' },
        ]);
    });

    test('returns the body unchanged when there are no users to match against', () => {
        expect(splitMentionText('Hi @Jane Cooper', [])).toEqual([
            { type: 'text', value: 'Hi @Jane Cooper' },
        ]);
    });
});
