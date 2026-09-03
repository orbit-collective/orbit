import { AlertProvider } from '@/context/AlertContext';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIntegrationsTab from './WorkspaceSettingsIntegrationsTab';

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

const renderTab = (
    props: Parameters<typeof WorkspaceSettingsIntegrationsTab>[0],
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsIntegrationsTab {...props} />
        </AlertProvider>,
    );

const projectA: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const projectB: MemberProjectSummary = {
    id: 2,
    name: 'Marketing',
    color: 'green',
};

describe('WorkspaceSettingsIntegrationsTab', () => {
    test('shows a message when the user has no project', () => {
        renderTab({ memberProjects: [], selectedProjectId: null });

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('shows a message when the user lacks integrations access on the selected project', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: false,
        });

        expect(
            screen.getByText(
                "You don't have access to this project's integrations",
            ),
        ).toBeInTheDocument();
    });

    test('renders a card for every integration with its stored status', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: true },
        });

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Google Calendar' }),
        ).toBeInTheDocument();
    });

    test('shows the project picker and switches project via a GET request when there is more than one project', async () => {
        renderTab({
            memberProjects: [projectA, projectB],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(screen.getByText('Marketing'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/settings?tab=integrations&project=2',
            {},
            { preserveScroll: true, preserveState: true },
        );
    });

    test('shows a read-only notice and disables toggles when the viewer cannot update integrations', () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: false,
        });

        expect(screen.getByText('Read-only access')).toBeInTheDocument();
    });

    test('toggling an integration sends a PATCH request scoped to the selected project', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: false },
        });

        const toggles = screen.getAllByRole('button', { name: '' });
        await userEvent.click(toggles[0]);

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.update/1/discord',
            { enabled: true },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('shows an error alert when the PATCH request fails', async () => {
        mockRouterPatch.mockImplementationOnce(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onError?.({ enabled: 'Something went wrong.' });
            },
        );
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        const toggles = screen.getAllByRole('button', { name: '' });
        await userEvent.click(toggles[0]);

        expect(
            await screen.findByText('Failed to update the integration.'),
        ).toBeInTheDocument();
    });

    test('toggling from inside the detail modal patches the same integration', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: false },
        });

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));
        await userEvent.click(screen.getByText('Connect'));

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.update/1/discord',
            { enabled: true },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('saving a webhook url from the modal sends a PATCH to the settings endpoint', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: false },
            integrationSettings: {
                discord: {
                    enabled: false,
                    hasWebhookUrl: false,
                    webhookUrl: null,
                    options: {},
                },
            },
        });

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));
        await userEvent.type(
            screen.getByPlaceholderText('https://discord.com/api/webhooks/…'),
            'https://discord.com/api/webhooks/1/abc',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.settings.update/1/discord',
            { webhook_url: 'https://discord.com/api/webhooks/1/abc' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('toggling a sub-option from the modal sends a PATCH to the settings endpoint', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { discord: true },
            integrationSettings: {
                discord: {
                    enabled: true,
                    hasWebhookUrl: true,
                    webhookUrl: 'https://discord.com/api/webhooks/1/abc',
                    options: { 'issue-activity': false },
                },
            },
        });

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));
        const optionsSection = screen.getByText('Options').closest('section')!;
        const optionToggles = within(optionsSection).getAllByRole('button', {
            name: '',
        });
        await userEvent.click(optionToggles[0]);

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects.integrations.settings.update/1/discord',
            { options: { 'issue-activity': true } },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('opens and closes the detail modal', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));
        expect(screen.getByText('Overview')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(screen.queryByText('Overview')).not.toBeInTheDocument();
    });

    test('filters the grid down to the selected category', async () => {
        renderTab({
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
        });

        await userEvent.click(screen.getByRole('button', { name: /^Storage/ }));

        expect(
            screen.getByRole('heading', { name: 'Google Drive' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Discord' }),
        ).not.toBeInTheDocument();
    });

    describe('Jira import live progress toast', () => {
        const jiraSettings = {
            hasCredentials: true,
            instanceUrl: 'https://example.atlassian.net',
            mappingMetadata: { statuses: [], priorities: [], issueTypes: [] },
            fieldMappings: [],
            lastImport: null,
        };

        const baseProps = {
            memberProjects: [projectA],
            selectedProjectId: projectA.id,
            hasIntegrationsAccess: true,
            canUpdateIntegrations: true,
            integrationStatuses: { jira: true },
            jiraSettings,
        };

        const triggerJiraImport = async () => {
            await userEvent.click(
                screen.getByRole('heading', { name: 'Jira' }),
            );
            await userEvent.type(
                screen.getByPlaceholderText('Jira project key'),
                'PR',
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Import' }),
            );
        };

        test('shows a persistent toast, then polls only jiraImportProgress + flash', async () => {
            renderTab({ ...baseProps, jiraImportProgress: null });

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
            const { rerender } = renderTab({
                ...baseProps,
                jiraImportProgress: null,
            });

            await triggerJiraImport();

            rerender(
                <AlertProvider>
                    <WorkspaceSettingsIntegrationsTab
                        {...baseProps}
                        jiraImportProgress={{
                            runId: 'run-1',
                            status: 'running',
                            imported: 2,
                            updated: 0,
                            skipped: 0,
                            failed: 0,
                        }}
                    />
                </AlertProvider>,
            );

            expect(
                screen.getByText('Importing… 2 imported'),
            ).toBeInTheDocument();

            rerender(
                <AlertProvider>
                    <WorkspaceSettingsIntegrationsTab
                        {...baseProps}
                        jiraImportProgress={{
                            runId: 'run-1',
                            status: 'done',
                            imported: 5,
                            updated: 1,
                            skipped: 0,
                            failed: 0,
                        }}
                    />
                </AlertProvider>,
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
            const { rerender } = renderTab({
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
                <AlertProvider>
                    <WorkspaceSettingsIntegrationsTab
                        {...baseProps}
                        jiraImportProgress={{
                            runId: 'stale-run',
                            status: 'done',
                            imported: 99,
                            updated: 0,
                            skipped: 0,
                            failed: 0,
                        }}
                    />
                </AlertProvider>,
            );

            expect(
                screen.getByText('Importing… 0 imported'),
            ).toBeInTheDocument();
            expect(screen.queryByText(/Import done/)).not.toBeInTheDocument();
        });

        test('shows a failure toast when the polled progress reports failed', async () => {
            const { rerender } = renderTab({
                ...baseProps,
                jiraImportProgress: null,
            });

            await triggerJiraImport();

            rerender(
                <AlertProvider>
                    <WorkspaceSettingsIntegrationsTab
                        {...baseProps}
                        jiraImportProgress={{
                            runId: 'run-2',
                            status: 'failed',
                            imported: 0,
                            updated: 0,
                            skipped: 0,
                            failed: 0,
                        }}
                    />
                </AlertProvider>,
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
