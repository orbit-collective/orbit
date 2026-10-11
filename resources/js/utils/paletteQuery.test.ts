import { describe, expect, test } from 'vitest';
import { MAX_QUERY_LENGTH, parsePaletteQuery } from './paletteQuery';

describe('parsePaletteQuery', () => {
    test('plain text searches everything once it has 2 characters', () => {
        expect(parsePaletteQuery('login')).toEqual({
            scope: 'all',
            text: 'login',
            serverQuery: 'login',
        });
        expect(parsePaletteQuery('  lo  ').serverQuery).toBe('lo');
    });

    test('a single character or blank input sends nothing', () => {
        expect(parsePaletteQuery('l').serverQuery).toBeNull();
        expect(parsePaletteQuery('4').serverQuery).toBeNull();
        expect(parsePaletteQuery('   ').serverQuery).toBeNull();
        expect(parsePaletteQuery('').serverQuery).toBeNull();
    });

    test('">" is commands only and never goes to the server', () => {
        expect(parsePaletteQuery('>create issue')).toEqual({
            scope: 'commands',
            text: 'create issue',
            serverQuery: null,
        });
        expect(parsePaletteQuery('>').text).toBe('');
    });

    test('"#" is issues only; one digit is enough for a number', () => {
        expect(parsePaletteQuery('#4')).toEqual({
            scope: 'issues',
            text: '4',
            serverQuery: '#4',
        });
        expect(parsePaletteQuery('#42').serverQuery).toBe('#42');
    });

    test('"#" followed by text needs 2 characters', () => {
        expect(parsePaletteQuery('#a').serverQuery).toBeNull();
        expect(parsePaletteQuery('#lo')).toEqual({
            scope: 'issues',
            text: 'lo',
            serverQuery: '#lo',
        });
    });

    test('a bare "#" waits for more input', () => {
        expect(parsePaletteQuery('#')).toEqual({
            scope: 'issues',
            text: '',
            serverQuery: null,
        });
    });

    test('a prefix is only a prefix at the very start', () => {
        expect(parsePaletteQuery('fix #42').scope).toBe('all');
        expect(parsePaletteQuery(' >x').scope).toBe('all');
    });

    test('truncates to the length the endpoint accepts', () => {
        const long = 'a'.repeat(MAX_QUERY_LENGTH + 50);

        expect(parsePaletteQuery(long).serverQuery).toHaveLength(
            MAX_QUERY_LENGTH,
        );
        expect(parsePaletteQuery(`#${long}`).serverQuery).toHaveLength(
            MAX_QUERY_LENGTH,
        );
    });
});
