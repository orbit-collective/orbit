import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import { IntegrationId, INTEGRATIONS } from '@/types/Integrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsIntegrationDetail from './WorkspaceSettingsIntegrationDetail';

vi.mock('@/hooks/useCommands', () => ({ useCommands: vi.fn() }));

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

type VisitOptions = {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
};

const { mockRouterPatch, mockRouterGet, mockRouterPost, mockRouterReload } =
    vi.hoisted(() => ({
        mockRouterPatch: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onSuccess?.();
            },
        ),
        mockRouterGet: vi.fn(),
        mockRouterPost: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onSuccess?.();
            },
        ),
        mockRouterReload: vi.fn(),
    }));

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: {
            ...actual.router,
            patch: mockRouterPatch,
            get: mockRouterGet,
            post: mockRouterPost,
            reload: mockRouterReload,
        },
    };
});

type DetailProps = Partial<
    Omit<
        Parameters<typeof WorkspaceSettingsIntegrationDetail>[0],
        'integration'
    >
>;

const projectA: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const projectB: MemberProjectSummary = {
    id: 2,
    name: 'Marketing',
    color: 'green',
};

const detailUi = (id: IntegrationId, props: DetailProps = {}) => (
    <AlertProvider>
        <WorkspaceSettingsIntegrationDetail
            integration={INTEGRATIONS.find(
                (integration) => integration.id === id,
            )!}
            memberProjects={[projectA]}
            selectedProjectId={projectA.id}
            hasIntegrationsAccess
            canUpdateIntegrations
            {...props}
        />
    </AlertProvider>
);

const renderDetail = (id: IntegrationId, props: DetailProps = {}) =>
    render(detailUi(id, props));

const discordSettings = (webhookUrl: string | null, options = {}) => ({
    enabled: false,
    hasWebhookUrl: webhookUrl !== null,
    webhookUrl,
    options,
});

describe('WorkspaceSettingsIntegrationDetail', () => {
    test('shows the integration, its state and the facts about it', () => {
        renderDetail('discord', { enabled: true });

        expect(
            screen.getByRole('heading', { level: 1, name: 'Discord' }),
        ).toBeInTheDocument();
        expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
        expect(screen.getByRole('heading', { name: 'Details' })).toBeVisible();
        expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
        expect(
            screen.getByRole('heading', { name: 'Configuration' }),
        ).toBeVisible();
        expect(
            screen.getAllByRole('term').map((term) => term.textContent),
        ).toEqual(['Vendor', 'Category', 'Type', 'Status', 'Website']);
    });

    test('links to the vendor website from the hero and the details', () => {
        renderDetail('discord');

        const links = screen.getAllByRole('link', {
            name: /discord\.com|Visit/,
        });

        expect(links.length).toBe(2);
        links.forEach((link) =>
            expect(link).toHaveAttribute('href', 'https://discord.com'),
        );
    });

    test('shows a message when the user has no project', () => {
        renderDetail('discord', {
            memberProjects: [],
            selectedProjectId: null,
        });

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('shows a message when the user lacks integrations access', () => {
        renderDetail('discord', { hasIntegrationsAccess: false });

        expect(
            screen.getByText(
                "You don't have access to this project's integrations",
            ),
        ).toBeInTheDocument();
        expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    });

    test('switches project with a GET to the same integration', async () => {
        renderDetail('discord', { memberProjects: [projectA, projectB] });

        await userEvent.click(screen.getByText('Marketing'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/settings/integrations/discord?project=2',
            {},
            { preserveScroll: true, preserveState: true },
        );
    });

    test('the Enable button patches the integration for the project', async () => {
        renderDetail('discord');

        await userEvent.click(screen.getByRole('button', { name: 'Enable' }));

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.update/1/discord',
            { enabled: true },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('an enabled integration offers Disable and reports it is pressed', async () => {
        renderDetail('discord', { enabled: true });

        const button = screen.getByRole('button', { name: 'Disable' });

        expect(button).toHaveAttribute('aria-pressed', 'true');

        await userEvent.click(button);

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.update/1/discord',
            { enabled: false },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('a viewer who cannot update sees the state but no Enable button', () => {
        renderDetail('discord', { canUpdateIntegrations: false });

        expect(screen.queryByRole('button', { name: 'Enable' })).toBeNull();
        expect(
            screen.getByText(/you don't have permission to change it/),
        ).toBeInTheDocument();
    });

    test('a locked integration has no Enable button and says it is not available yet', () => {
        renderDetail('slack');

        expect(screen.queryByRole('button', { name: 'Enable' })).toBeNull();
        expect(screen.getAllByText('Coming soon').length).toBeGreaterThan(0);
        expect(
            screen.getByText(/This integration is not available yet/),
        ).toBeInTheDocument();
    });

    test('GitHub has no Enable button, its panel owns the connection', () => {
        renderDetail('github');

        expect(screen.queryByRole('button', { name: 'Enable' })).toBeNull();
        expect(
            screen.getByRole('button', { name: 'Connect with GitHub' }),
        ).toBeInTheDocument();
    });

    test('saving a webhook url sends a PATCH to the settings endpoint', async () => {
        renderDetail('discord', { settings: discordSettings(null) });

        const save = screen.getByRole('button', { name: 'Save' });

        expect(save).toBeDisabled();

        await userEvent.type(
            screen.getByLabelText('Webhook URL'),
            'https://discord.com/api/webhooks/1/abc',
        );
        await userEvent.click(save);

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.settings.update/1/discord',
            { webhook_url: 'https://discord.com/api/webhooks/1/abc' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('pressing Enter in the webhook field saves it', async () => {
        renderDetail('discord', { settings: discordSettings(null) });

        await userEvent.type(
            screen.getByLabelText('Webhook URL'),
            'https://discord.com/api/webhooks/1/abc{Enter}',
        );

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.settings.update/1/discord',
            { webhook_url: 'https://discord.com/api/webhooks/1/abc' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('toggling a sub-option sends a PATCH to the settings endpoint', async () => {
        renderDetail('discord', {
            enabled: true,
            settings: discordSettings(
                'https://discord.com/api/webhooks/1/abc',
                {
                    'issue-activity': false,
                },
            ),
        });

        const optionsSection = screen.getByText('Options').closest('section')!;

        await userEvent.click(
            within(optionsSection).getByRole('switch', {
                name: 'Issue activity',
            }),
        );

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.settings.update/1/discord',
            { options: { 'issue-activity': true } },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('a member who cannot update sees whether a webhook is set but not its value', () => {
        renderDetail('discord', {
            canUpdateIntegrations: false,
            settings: discordSettings(null),
        });

        expect(screen.queryByLabelText('Webhook URL')).toBeNull();
        expect(
            screen.getByText('No webhook URL has been configured yet.'),
        ).toBeInTheDocument();
    });

    test('shows an error alert when the PATCH request fails', async () => {
        mockRouterPatch.mockImplementationOnce(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onError?.({ enabled: 'Something went wrong.' });
            },
        );
        renderDetail('discord');

        await userEvent.click(screen.getByRole('button', { name: 'Enable' }));

        expect(
            await screen.findByText('Failed to update the integration.'),
        ).toBeInTheDocument();
    });

    test('the page panels fold', () => {
        render(
            inSettingsPage(
                detailUi('discord', {
                    memberProjects: [projectA, projectB],
                }),
                'integrations',
            ),
        );

        expectPanelsToFold([/^Project/]);
    });

    describe('GitHub connect flow', () => {
        test('opens a blank tab synchronously, then navigates it to the install url once the request succeeds', async () => {
            const fakeTab = {
                opener: {},
                location: { href: '' },
                close: vi.fn(),
            };
            // Mirrors the spec: with 'noopener' window.open returns null even
            // though the tab opens.
            const openSpy = vi
                .spyOn(window, 'open')
                .mockImplementation((_url, _target, features) =>
                    features?.includes('noopener')
                        ? null
                        : (fakeTab as unknown as Window),
                );

            renderDetail('github', {
                githubConnectStatus: {
                    status: 'not_connected',
                    installUrl:
                        'https://github.com/apps/orbit/installations/new?state=xyz',
                    repository: null,
                    repositories: [],
                    connectedAt: null,
                    health: null,
                    lastSuccessfulSyncAt: null,
                    lastSyncAttemptAt: null,
                    lastFailedSyncAt: null,
                    errorMessage: null,
                    pendingEventCount: null,
                    pendingEventCountCapped: false,
                },
            });

            await userEvent.click(
                screen.getByRole('button', { name: 'Connect with GitHub' }),
            );

            // window.open must be called before router.post resolves - not
            // after - or the browser treats it as an unrelated popup and
            // blocks it.
            expect(openSpy).toHaveBeenCalledWith('', '_blank');
            expect(mockRouterPost).toHaveBeenCalledWith(
                '/projects.integrations.github.connect/1',
                {},
                expect.objectContaining({ preserveScroll: true }),
            );
            expect(fakeTab.location.href).toBe(
                'https://github.com/apps/orbit/installations/new?state=xyz',
            );
            expect(fakeTab.opener).toBeNull();

            openSpy.mockRestore();
        });

        test('clears the opener right away, before the connect request resolves', async () => {
            const fakeTab = {
                opener: {},
                location: { href: '' },
                close: vi.fn(),
            };
            const openSpy = vi
                .spyOn(window, 'open')
                .mockReturnValue(fakeTab as unknown as Window);
            // Leave the request pending - no onSuccess/onError.
            mockRouterPost.mockImplementationOnce(() => {});

            renderDetail('github');

            await userEvent.click(
                screen.getByRole('button', { name: 'Connect with GitHub' }),
            );

            expect(mockRouterPost).toHaveBeenCalled();
            expect(fakeTab.opener).toBeNull();
            expect(fakeTab.location.href).toBe('');

            openSpy.mockRestore();
        });

        test('shows an error and never sends the request when the popup is blocked', async () => {
            const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

            renderDetail('github');

            await userEvent.click(
                screen.getByRole('button', { name: 'Connect with GitHub' }),
            );

            expect(
                await screen.findByText(
                    /Your browser blocked the GitHub install tab/,
                ),
            ).toBeInTheDocument();
            expect(mockRouterPost).not.toHaveBeenCalled();

            openSpy.mockRestore();
        });
    });

    describe('GitHub repositories refresh', () => {
        const orbit = { id: 1, owner: 'orbit-collective', name: 'orbit' };
        const orbitApi = {
            id: 2,
            owner: 'orbit-collective',
            name: 'orbit-api',
        };
        const orbitWeb = {
            id: 3,
            owner: 'orbit-collective',
            name: 'orbit-web',
        };

        const githubProps = (repositories: (typeof orbit)[]): DetailProps => ({
            enabled: true,
            githubConnectStatus: {
                status: 'connected',
                installUrl: null,
                repository: { owner: 'orbit-collective', name: 'orbit' },
                repositories,
                connectedAt: '2026-10-01T00:00:00Z',
                health: 'healthy',
                lastSuccessfulSyncAt: null,
                lastSyncAttemptAt: null,
                lastFailedSyncAt: null,
                errorMessage: null,
                pendingEventCount: 0,
                pendingEventCountCapped: false,
            },
        });

        test('posts to the sync route and shows the refreshed list', async () => {
            const { rerender } = renderDetail('github', githubProps([orbit]));

            await userEvent.click(
                screen.getByRole('button', { name: 'Refresh' }),
            );

            expect(mockRouterPost).toHaveBeenCalledWith(
                '/projects.integrations.github.repositories.sync/1',
                {},
                expect.objectContaining({ preserveScroll: true }),
            );

            // Inertia re-renders the page with the synced status.
            rerender(detailUi('github', githubProps([orbit, orbitApi])));

            expect(
                screen.getByText('orbit-collective/orbit-api'),
            ).toBeInTheDocument();
        });

        test('disables the button while a refresh is in flight', async () => {
            let finish: (() => void) | undefined;

            mockRouterPost.mockImplementationOnce((_url, _data, opts) => {
                finish = (opts as { onFinish?: () => void })?.onFinish;
            });

            renderDetail('github', githubProps([orbit]));

            await userEvent.click(
                screen.getByRole('button', { name: 'Refresh' }),
            );

            const pending = screen.getByRole('button', {
                name: 'Refreshing…',
            });

            expect(pending).toBeDisabled();

            await userEvent.click(pending);

            expect(mockRouterPost).toHaveBeenCalledTimes(1);

            act(() => finish?.());

            expect(
                screen.getByRole('button', { name: 'Refresh' }),
            ).toBeEnabled();
        });

        test('reloads an open repository picker instead of emptying it', async () => {
            const fetchSpy = vi
                .spyOn(globalThis, 'fetch')
                .mockImplementation(
                    async () =>
                        new Response(
                            JSON.stringify({ repositories: [orbitWeb] }),
                        ),
                );

            renderDetail('github', githubProps([orbit]));

            await userEvent.click(
                screen.getByRole('button', { name: 'Add repository' }),
            );

            expect(
                await screen.findByText('orbit-collective/orbit-web'),
            ).toBeInTheDocument();

            await userEvent.click(
                screen.getByRole('button', { name: 'Refresh' }),
            );

            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));
            expect(
                await screen.findByText('orbit-collective/orbit-web'),
            ).toBeInTheDocument();

            fetchSpy.mockRestore();
        });

        const jsonResponse = (repositories: (typeof orbit)[]) =>
            new Response(JSON.stringify({ repositories }));

        test('reloads the picker even when Refresh is clicked while it is still loading', async () => {
            let resolveFirst: ((response: Response) => void) | undefined;
            const fetchSpy = vi
                .spyOn(globalThis, 'fetch')
                .mockImplementationOnce(
                    () =>
                        new Promise<Response>((resolve) => {
                            resolveFirst = resolve;
                        }),
                )
                .mockImplementation(async () =>
                    jsonResponse([orbitWeb, orbitApi]),
                );

            renderDetail('github', githubProps([orbit]));

            await userEvent.click(
                screen.getByRole('button', { name: 'Add repository' }),
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Refresh' }),
            );

            await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(2));

            // The older, slower request lands last and must be ignored.
            await act(async () => {
                resolveFirst?.(jsonResponse([orbitWeb]));
            });

            expect(
                await screen.findByText('orbit-collective/orbit-api'),
            ).toBeInTheDocument();

            fetchSpy.mockRestore();
        });
    });

    describe('Jira import live progress toast', () => {
        const jiraSettings = {
            hasCredentials: true,
            instanceUrl: 'https://example.atlassian.net',
            mappingMetadata: { statuses: [], priorities: [], issueTypes: [] },
            fieldMappings: [],
            lastImport: null,
        };

        const baseProps: DetailProps = { enabled: true, jiraSettings };

        const triggerJiraImport = async () => {
            await userEvent.type(
                screen.getByPlaceholderText('Jira project key'),
                'PR',
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Import' }),
            );
        };

        test('shows a persistent toast, then polls only jiraImportProgress + flash', async () => {
            renderDetail('jira', { ...baseProps, jiraImportProgress: null });

            await triggerJiraImport();

            expect(
                screen.getByText('Importing… 0 imported'),
            ).toBeInTheDocument();
            expect(mockRouterPost).toHaveBeenCalledWith(
                '/projects.integrations.jira.import/1',
                { project_key: 'PR', sync_existing: false },
                expect.objectContaining({ preserveScroll: true }),
            );

            // The poller only fires on its interval (1.5s), not immediately
            // on trigger - use the real clock rather than fake timers, which
            // don't play well with userEvent's own internal timing.
            expect(mockRouterReload).not.toHaveBeenCalled();
            await waitFor(
                () =>
                    expect(mockRouterReload).toHaveBeenCalledWith({
                        only: ['jiraImportProgress', 'flash'],
                    }),
                { timeout: 2500, interval: 100 },
            );
        });

        test('finishes with a success summary once the polled progress reports done', async () => {
            const { rerender } = renderDetail('jira', {
                ...baseProps,
                jiraImportProgress: null,
            });

            await triggerJiraImport();

            rerender(
                detailUi('jira', {
                    ...baseProps,
                    jiraImportProgress: {
                        runId: 'run-1',
                        status: 'running',
                        imported: 2,
                        updated: 0,
                        skipped: 0,
                        failed: 0,
                    },
                }),
            );

            expect(
                screen.getByText('Importing… 2 imported'),
            ).toBeInTheDocument();

            rerender(
                detailUi('jira', {
                    ...baseProps,
                    jiraImportProgress: {
                        runId: 'run-1',
                        status: 'done',
                        imported: 5,
                        updated: 1,
                        skipped: 0,
                        failed: 0,
                    },
                }),
            );

            // The removed toast stays in the DOM until framer-motion's exit
            // transition finishes, so its disappearance has to be awaited
            // rather than asserted synchronously.
            await waitFor(() =>
                expect(
                    screen.queryByText(/Importing…/),
                ).not.toBeInTheDocument(),
            );
            expect(
                screen.getByText('Import done — 5 imported, 1 updated.'),
            ).toBeInTheDocument();
        });

        test('ignores a leftover progress record from a previous run', async () => {
            const { rerender } = renderDetail('jira', {
                ...baseProps,
                jiraImportProgress: {
                    runId: 'stale-run',
                    status: 'done',
                    imported: 99,
                    updated: 0,
                    skipped: 0,
                    failed: 0,
                },
            });

            await triggerJiraImport();

            expect(
                screen.getByText('Importing… 0 imported'),
            ).toBeInTheDocument();

            // A poll tick that still returns the stale run's 'done' record
            // (the job hasn't picked up the new run yet) must not be
            // mistaken for the new import finishing.
            rerender(
                detailUi('jira', {
                    ...baseProps,
                    jiraImportProgress: {
                        runId: 'stale-run',
                        status: 'done',
                        imported: 99,
                        updated: 0,
                        skipped: 0,
                        failed: 0,
                    },
                }),
            );

            expect(
                screen.getByText('Importing… 0 imported'),
            ).toBeInTheDocument();
            expect(screen.queryByText(/Import done/)).not.toBeInTheDocument();
        });

        test('shows a failure toast when the polled progress reports failed', async () => {
            const { rerender } = renderDetail('jira', {
                ...baseProps,
                jiraImportProgress: null,
            });

            await triggerJiraImport();

            rerender(
                detailUi('jira', {
                    ...baseProps,
                    jiraImportProgress: {
                        runId: 'run-2',
                        status: 'failed',
                        imported: 0,
                        updated: 0,
                        skipped: 0,
                        failed: 0,
                    },
                }),
            );

            await waitFor(() =>
                expect(
                    screen.queryByText(/Importing…/),
                ).not.toBeInTheDocument(),
            );
            expect(
                screen.getByText(
                    'Import failed — check your notifications for details.',
                ),
            ).toBeInTheDocument();
        });
    });
});
