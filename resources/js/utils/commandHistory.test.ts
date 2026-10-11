import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PaletteSearchIssue } from '@/types/Commands';
import {
    clearHistory,
    HISTORY_LIMIT,
    loadHistory,
    recordHistory,
} from './commandHistory';

const KEY = 'orbit.command-palette.history';

const issue = (id: number): PaletteSearchIssue => ({
    id,
    number: id,
    title: `Issue ${id}`,
    url: `/projects/1/issues/${id}`,
    project: { id: 1, name: 'Orbit' },
    type: null,
    status: null,
});

beforeEach(() => localStorage.clear());

describe('commandHistory', () => {
    test('starts empty', () => {
        expect(loadHistory()).toEqual([]);
    });

    test('records newest first', () => {
        recordHistory({ type: 'command', id: 'a' });
        recordHistory({ type: 'issue', issue: issue(1) });

        expect(loadHistory()).toEqual([
            { type: 'issue', issue: issue(1) },
            { type: 'command', id: 'a' },
        ]);
    });

    test('moves a repeated entry to the front instead of duplicating it', () => {
        recordHistory({ type: 'command', id: 'a' });
        recordHistory({ type: 'command', id: 'b' });
        recordHistory({ type: 'command', id: 'a' });

        expect(
            loadHistory().map((e) => (e.type === 'command' ? e.id : '')),
        ).toEqual(['a', 'b']);
    });

    test('a command and an issue with the same number are different entries', () => {
        recordHistory({ type: 'command', id: '1' });
        recordHistory({ type: 'issue', issue: issue(1) });

        expect(loadHistory()).toHaveLength(2);
    });

    test('keeps only the last 8 entries', () => {
        for (let i = 0; i < 12; i++) {
            recordHistory({ type: 'command', id: `c${i}` });
        }

        const history = loadHistory();
        expect(history).toHaveLength(HISTORY_LIMIT);
        expect(history[0]).toEqual({ type: 'command', id: 'c11' });
    });

    test('ignores malformed storage content', () => {
        localStorage.setItem(KEY, '{not json');
        expect(loadHistory()).toEqual([]);

        localStorage.setItem(KEY, JSON.stringify({ not: 'an array' }));
        expect(loadHistory()).toEqual([]);

        localStorage.setItem(
            KEY,
            JSON.stringify([
                { type: 'command', id: 'ok' },
                { type: 'command', id: 5 },
                { type: 'issue', issue: { id: 'x' } },
                { type: 'issue' },
                { type: 'unknown' },
                null,
                'text',
            ]),
        );
        expect(loadHistory()).toEqual([{ type: 'command', id: 'ok' }]);
    });

    test('never throws when storage is unavailable', () => {
        const getItem = vi
            .spyOn(localStorage, 'getItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });
        const setItem = vi
            .spyOn(localStorage, 'setItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });
        const removeItem = vi
            .spyOn(localStorage, 'removeItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });

        expect(loadHistory()).toEqual([]);
        expect(() => recordHistory({ type: 'command', id: 'a' })).not.toThrow();
        expect(() => clearHistory()).not.toThrow();

        getItem.mockRestore();
        setItem.mockRestore();
        removeItem.mockRestore();
    });

    test('clearHistory empties it', () => {
        recordHistory({ type: 'command', id: 'a' });

        clearHistory();

        expect(loadHistory()).toEqual([]);
    });
});
