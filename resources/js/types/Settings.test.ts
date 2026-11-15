import { describe, expect, test } from 'vitest';
import { SETTINGS_DEFAULT_TAB, getSettingsTabByPath } from './Settings';

describe('getSettingsTabByPath', () => {
    test('finds a tab by its path, ignoring the query and a trailing slash', () => {
        expect(getSettingsTabByPath('/settings/members')).toBe('members');
        expect(getSettingsTabByPath('/settings/members/?project=2')).toBe(
            'members',
        );
    });

    test('keeps a page below a tab on that tab', () => {
        expect(getSettingsTabByPath('/settings/integrations/github')).toBe(
            'integrations',
        );
        expect(
            getSettingsTabByPath('/settings/integrations/jira?project=3'),
        ).toBe('integrations');
    });

    test('does not match a path that only starts with the same letters', () => {
        expect(getSettingsTabByPath('/settings/integrationsfoo')).toBe(
            SETTINGS_DEFAULT_TAB,
        );
    });

    test('falls back to the default tab for anything unknown', () => {
        expect(getSettingsTabByPath('/settings')).toBe(SETTINGS_DEFAULT_TAB);
        expect(getSettingsTabByPath('/elsewhere')).toBe(SETTINGS_DEFAULT_TAB);
    });
});
