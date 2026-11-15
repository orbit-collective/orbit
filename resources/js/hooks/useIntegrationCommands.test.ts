import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';
import { INTEGRATIONS } from '@/types/Integrations';
import { GithubConnectStatus } from '@/types/ProjectIntegrations';

const mocks = vi.hoisted(() => ({
    useCommands: vi.fn(),
    visit: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ router: { visit: mocks.visit } }));
vi.mock('@/hooks/useCommands', () => ({ useCommands: mocks.useCommands }));

import {
    useIntegrationCommands,
    useIntegrationListCommands,
} from './useIntegrationCommands';

const registered = (): Command[] =>
    mocks.useCommands.mock.calls[
        mocks.useCommands.mock.calls.length - 1
    ][0] as Command[];
const byId = (id: string) => registered().find((command) => command.id === id);

const discord = INTEGRATIONS.find(({ id }) => id === 'discord')!;
const github = INTEGRATIONS.find(({ id }) => id === 'github')!;
const slack = INTEGRATIONS.find(({ id }) => id === 'slack')!;

beforeEach(() => vi.clearAllMocks());

describe('useIntegrationListCommands', () => {
    const render = (
        overrides: Partial<
            Parameters<typeof useIntegrationListCommands>[0]
        > = {},
    ) => {
        const onToggle = vi.fn();

        renderHook(() =>
            useIntegrationListCommands({
                projectId: 4,
                canUpdate: true,
                statuses: { discord: true },
                onToggle,
                ...overrides,
            }),
        );

        return { onToggle };
    };

    test('has an open command for every integration that goes to its page', () => {
        render();

        expect(
            registered().filter(({ id }) =>
                id.startsWith('integrations.open.'),
            ),
        ).toHaveLength(INTEGRATIONS.length);

        byId('integrations.open.discord')!.perform!();

        expect(mocks.visit).toHaveBeenCalledWith(
            '/settings/integrations/discord?project=4',
        );
        expect(byId('integrations.open.discord')!.title).toBe(
            'Open integration: Discord',
        );
    });

    test('flips the enabled state of a wired up integration', () => {
        const { onToggle } = render({
            statuses: { discord: true, jira: false },
        });

        expect(byId('integrations.toggle.discord')!.title).toBe(
            'Disable Discord',
        );
        expect(byId('integrations.toggle.jira')!.title).toBe('Enable Jira');

        byId('integrations.toggle.discord')!.perform!();
        byId('integrations.toggle.jira')!.perform!();

        expect(onToggle).toHaveBeenNthCalledWith(1, 'discord', false);
        expect(onToggle).toHaveBeenNthCalledWith(2, 'jira', true);
    });

    test('offers no toggle for a locked integration or for GitHub', () => {
        render();

        expect(byId('integrations.toggle.slack')).toBeUndefined();
        expect(byId('integrations.toggle.github')).toBeUndefined();
    });

    test('offers no toggle at all without permission to update', () => {
        render({ canUpdate: false });

        expect(
            registered().some(({ id }) =>
                id.startsWith('integrations.toggle.'),
            ),
        ).toBe(false);
        expect(byId('integrations.open.discord')).toBeDefined();
    });
});

describe('useIntegrationCommands', () => {
    const status = (value: GithubConnectStatus['status']) =>
        ({ status: value }) as GithubConnectStatus;

    const render = (
        overrides: Partial<Parameters<typeof useIntegrationCommands>[0]> = {},
    ) => {
        const handlers = {
            onToggle: vi.fn(),
            onConnectGithub: vi.fn(),
            onDisconnectGithub: vi.fn(),
            onRefreshGithubRepositories: vi.fn(),
        };

        renderHook(() =>
            useIntegrationCommands({
                integration: discord,
                projectId: 4,
                enabled: false,
                canUpdate: true,
                githubStatus: null,
                ...handlers,
                ...overrides,
            }),
        );

        return handlers;
    };

    test('goes back to the list of the same project', () => {
        render();

        byId('integration.back')!.perform!();

        expect(mocks.visit).toHaveBeenCalledWith(
            '/settings/integrations?project=4',
        );
    });

    test('opens the vendor website in a new tab without an opener', () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);
        render();

        byId('integration.website')!.perform!();

        expect(open).toHaveBeenCalledWith(
            'https://discord.com',
            '_blank',
            'noopener,noreferrer',
        );
        open.mockRestore();
    });

    test('toggles the integration and names the action after its state', () => {
        const handlers = render();

        expect(byId('integration.toggle')!.title).toBe('Enable Discord');

        byId('integration.toggle')!.perform!();

        expect(handlers.onToggle).toHaveBeenCalledWith(true);

        render({ enabled: true });

        expect(byId('integration.toggle')!.title).toBe('Disable Discord');
    });

    test('has no toggle without permission, for a locked integration or for GitHub', () => {
        render({ canUpdate: false });
        expect(byId('integration.toggle')).toBeUndefined();

        render({ integration: slack });
        expect(byId('integration.toggle')).toBeUndefined();

        render({ integration: github });
        expect(byId('integration.toggle')).toBeUndefined();
    });

    test('GitHub offers connect while it is not connected', () => {
        const handlers = render({
            integration: github,
            githubStatus: status('not_connected'),
        });

        byId('integration.github.connect')!.perform!();

        expect(handlers.onConnectGithub).toHaveBeenCalled();
        expect(byId('integration.github.disconnect')).toBeUndefined();
    });

    test('GitHub offers refresh and disconnect once connected', () => {
        const handlers = render({
            integration: github,
            githubStatus: status('connected'),
        });

        byId('integration.github.refresh')!.perform!();
        byId('integration.github.disconnect')!.perform!();

        expect(handlers.onRefreshGithubRepositories).toHaveBeenCalled();
        expect(handlers.onDisconnectGithub).toHaveBeenCalled();
        expect(byId('integration.github.connect')).toBeUndefined();
    });

    test('GitHub offers nothing to connect while an installation is pending or without permission', () => {
        render({ integration: github, githubStatus: status('pending') });
        expect(byId('integration.github.connect')).toBeUndefined();

        render({
            integration: github,
            githubStatus: status('connected'),
            canUpdate: false,
        });
        expect(byId('integration.github.disconnect')).toBeUndefined();
    });
});
