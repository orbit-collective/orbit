import { describe, expect, test } from 'vitest';
import { integrationPath, integrationsPath } from './integrationPaths';

describe('integrationPaths', () => {
    test('builds the overview path with or without a project', () => {
        expect(integrationsPath()).toBe('/settings/integrations');
        expect(integrationsPath(null)).toBe('/settings/integrations');
        expect(integrationsPath(4)).toBe('/settings/integrations?project=4');
    });

    test('builds an integration path with or without a project', () => {
        expect(integrationPath('github')).toBe('/settings/integrations/github');
        expect(integrationPath('microsoft-teams', 2)).toBe(
            '/settings/integrations/microsoft-teams?project=2',
        );
    });
});
