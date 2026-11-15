import { describe, expect, test } from 'vitest';
import { INTEGRATIONS } from '@/types/Integrations';
import {
    integrationState,
    matchesSearch,
    normalizeSearchText,
} from './integrationFilters';

const discord = INTEGRATIONS.find(({ id }) => id === 'discord')!;
const slack = INTEGRATIONS.find(({ id }) => id === 'slack')!;

describe('integrationState', () => {
    test('is enabled or disabled for an integration that is wired up', () => {
        expect(integrationState(discord, true)).toBe('enabled');
        expect(integrationState(discord, false)).toBe('disabled');
    });

    test('is soon for one that is not shipped, whatever its flag says', () => {
        expect(integrationState(slack, false)).toBe('soon');
        expect(integrationState(slack, true)).toBe('soon');
    });
});

describe('normalizeSearchText', () => {
    test('lowercases, trims and drops accents', () => {
        expect(normalizeSearchText('  Zdarzeń ŁÓDŹ ')).toBe('zdarzen łodz');
    });
});

describe('matchesSearch', () => {
    test('an empty or blank query matches everything', () => {
        expect(matchesSearch('Discord', '')).toBe(true);
        expect(matchesSearch('Discord', '   ')).toBe(true);
    });

    test('is case and accent insensitive', () => {
        expect(matchesSearch('Wysyła zdarzenia', 'ZDARZEŃ'.slice(0, 5))).toBe(
            true,
        );
        expect(matchesSearch('Zdarzeń', 'zdarzen')).toBe(true);
    });

    test('needs every word, in any order', () => {
        expect(
            matchesSearch('Post issue activity to Discord', 'discord post'),
        ).toBe(true);
        expect(
            matchesSearch('Post issue activity to Discord', 'discord jira'),
        ).toBe(false);
    });

    test('finds a part of a word', () => {
        expect(matchesSearch('Communication', 'munic')).toBe(true);
    });
});
