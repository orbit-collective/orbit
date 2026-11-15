import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useEffect, useRef, useState } from 'react';
import { useAlert } from '@/context/AlertContext';
import { IntegrationId } from '@/types/Integrations';
import {
    GithubConnectedRepository,
    GithubConnectStatus,
    IntegrationFieldMappingDraft,
    IntegrationImportProgress,
} from '@/types/ProjectIntegrations';

/** integration id -> its import-flow route names, for import-kind integrations that are actually wired up. */
const IMPORT_ROUTE_NAMES: Partial<
    Record<IntegrationId, { connect: string; mappings: string; import: string }>
> = {
    jira: {
        connect: 'projects.integrations.jira.connect',
        mappings: 'projects.integrations.jira.mappings.update',
        import: 'projects.integrations.jira.import',
    },
};

/** How often the "Importing…" toast polls jiraImportProgress while a run is in flight. */
const IMPORT_POLL_INTERVAL_MS = 1500;

/** How often the GitHub panel polls for a pending connection to finish, and for how long before giving up. */
const GITHUB_POLL_INTERVAL_MS = 2000;
const GITHUB_POLL_TIMEOUT_MS = 5 * 60 * 1000;

function describeImportCounts(
    progress: {
        imported: number;
        updated: number;
        skipped: number;
        failed: number;
    },
    t: (key: string, replacements?: Record<string, string | number>) => string,
): string {
    const count = (key: 'imported' | 'updated' | 'skipped' | 'failed') =>
        t(`workspace_settings_integrations.tab.counts.${key}`, {
            count: progress[key],
        });
    const parts = [count('imported')];

    if (progress.updated) parts.push(count('updated'));
    if (progress.skipped) parts.push(count('skipped'));
    if (progress.failed) parts.push(count('failed'));

    return parts.join(', ');
}

interface UseIntegrationActionsOptions {
    /** The project the integrations belong to; every action is a no-op without one. */
    projectId: number | null;
    jiraImportProgress?: IntegrationImportProgress | null;
    githubConnectStatus?: GithubConnectStatus | null;
}

/**
 * Everything an integration's page can do to the selected project - toggle it,
 * save its settings, the Jira import flow (with its live progress toast) and
 * the GitHub App flow (install tab, polling, repository picker). Each action
 * is an Inertia visit that reports through the alert toasts.
 */
export function useIntegrationActions({
    projectId,
    jiraImportProgress = null,
    githubConnectStatus = null,
}: UseIntegrationActionsOptions) {
    const selectedProject = projectId === null ? null : { id: projectId };
    const { t } = useLaravelReactI18n();
    // The alert effect below must not re-run when `t` changes identity.
    const tRef = useRef(t);
    tRef.current = t;
    const { addAlert, updateAlert, removeAlert } = useAlert();
    // Tracks the live "Importing…" toast across poll ticks: which alert to
    // update, the interval driving the polling, and the runId the progress
    // record had right before this import was triggered (so a poll that
    // still sees the *previous* run's leftover 'done'/'failed' state - the
    // job hasn't picked up the new one up yet - is correctly ignored
    // instead of closing the toast prematurely).
    const importAlertIdRef = useRef<string | null>(null);
    const importPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const importBaselineRunIdRef = useRef<string | null>(null);

    const stopImportPolling = () => {
        if (importPollTimerRef.current !== null) {
            clearInterval(importPollTimerRef.current);
            importPollTimerRef.current = null;
        }
    };

    useEffect(() => stopImportPolling, []);

    useEffect(() => {
        const alertId = importAlertIdRef.current;

        if (!alertId || !jiraImportProgress) return;
        if (jiraImportProgress.runId === importBaselineRunIdRef.current) {
            return;
        }

        if (jiraImportProgress.status === 'running') {
            updateAlert(alertId, {
                message: tRef.current(
                    'workspace_settings_integrations.tab.importing',
                    {
                        counts: describeImportCounts(
                            jiraImportProgress,
                            tRef.current,
                        ),
                    },
                ),
            });

            return;
        }

        stopImportPolling();
        importAlertIdRef.current = null;
        removeAlert(alertId);

        if (jiraImportProgress.status === 'done') {
            addAlert(
                tRef.current(
                    'workspace_settings_integrations.tab.import_done',
                    {
                        counts: describeImportCounts(
                            jiraImportProgress,
                            tRef.current,
                        ),
                    },
                ),
                jiraImportProgress.failed > 0 ? 'warning' : 'success',
                6000,
            );
        } else {
            addAlert(
                tRef.current(
                    'workspace_settings_integrations.tab.import_failed',
                ),
                'error',
                6000,
            );
        }
    }, [jiraImportProgress, addAlert, removeAlert, updateAlert]);

    // Always holds the latest githubConnectStatus, readable from inside a
    // router.post onSuccess callback: that callback closes over the props
    // from the render it was created in (the click), but Inertia has
    // already swapped in fresh page props (and thus re-run this render,
    // updating this ref) by the time onSuccess actually fires.
    const githubStatusRef = useRef(githubConnectStatus);
    githubStatusRef.current = githubConnectStatus;

    const githubPollTimerRef = useRef<ReturnType<typeof setInterval> | null>(
        null,
    );
    const githubPollDeadlineRef = useRef<number | null>(null);

    const stopGithubPolling = () => {
        if (githubPollTimerRef.current !== null) {
            clearInterval(githubPollTimerRef.current);
            githubPollTimerRef.current = null;
        }
    };

    useEffect(() => stopGithubPolling, []);

    const startGithubPolling = () => {
        stopGithubPolling();
        githubPollDeadlineRef.current = Date.now() + GITHUB_POLL_TIMEOUT_MS;

        githubPollTimerRef.current = setInterval(() => {
            if (
                githubPollDeadlineRef.current !== null &&
                Date.now() > githubPollDeadlineRef.current
            ) {
                stopGithubPolling();

                return;
            }

            // 'flash' included for the same reason as the Jira import poll
            // above - see that call's comment.
            router.reload({ only: ['githubConnectStatus', 'flash'] });
        }, GITHUB_POLL_INTERVAL_MS);
    };

    // Resumes polling on a fresh page load if a connection was left
    // "pending" (e.g. the user navigated away and came back), and stops it
    // once the status leaves "pending" either way.
    useEffect(() => {
        if (githubConnectStatus?.status === 'pending') {
            if (githubPollTimerRef.current === null) {
                startGithubPolling();
            }
        } else {
            stopGithubPolling();
        }
    }, [githubConnectStatus?.status]);

    const toggleIntegration = (
        integrationId: IntegrationId,
        checked: boolean,
    ) => {
        if (!selectedProject) return;

        router.patch(
            route('projects.integrations.update', [
                selectedProject.id,
                integrationId,
            ]),
            { enabled: checked },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        t(
                            checked
                                ? 'workspace_settings_integrations.tab.enabled'
                                : 'workspace_settings_integrations.tab.disabled',
                            { integration: integrationId },
                        ),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t('workspace_settings_integrations.tab.update_failed'),
                        'error',
                    );
                },
            },
        );
    };

    const saveIntegrationSettings = (
        integrationId: IntegrationId,
        data: { webhook_url?: string; options?: Record<string, boolean> },
    ) => {
        if (!selectedProject) return;

        router.patch(
            route('projects.integrations.settings.update', [
                selectedProject.id,
                integrationId,
            ]),
            data,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.settings_updated',
                        ),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.settings_update_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const connectImportIntegration = (
        integrationId: IntegrationId,
        credentials: Record<string, string>,
    ) => {
        const routeNames = IMPORT_ROUTE_NAMES[integrationId];

        if (!selectedProject || !routeNames) return;

        router.post(
            route(routeNames.connect, [selectedProject.id]),
            credentials,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        t('workspace_settings_integrations.tab.connected_to', {
                            integration: integrationId,
                        }),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.connect_failed',
                            {
                                integration: integrationId,
                            },
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const saveImportMappings = (
        integrationId: IntegrationId,
        mappings: IntegrationFieldMappingDraft[],
    ) => {
        const routeNames = IMPORT_ROUTE_NAMES[integrationId];

        if (!selectedProject || !routeNames) return;

        router.put(
            route(routeNames.mappings, [selectedProject.id]),
            { mappings },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.mappings_updated',
                        ),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.mappings_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const triggerImport = (
        integrationId: IntegrationId,
        projectKey: string,
        syncExisting: boolean,
    ) => {
        const routeNames = IMPORT_ROUTE_NAMES[integrationId];

        if (!selectedProject || !routeNames) return;

        router.post(
            route(routeNames.import, [selectedProject.id]),
            { project_key: projectKey, sync_existing: syncExisting },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Only Jira reports live progress today (jiraImportProgress
                    // is a Jira-specific prop) - other import integrations
                    // still get the plain "started" toast until they get
                    // their own progress prop wired the same way.
                    if (integrationId !== 'jira') {
                        addAlert(
                            t(
                                'workspace_settings_integrations.tab.import_started',
                            ),
                            'success',
                        );

                        return;
                    }

                    stopImportPolling();
                    importBaselineRunIdRef.current =
                        jiraImportProgress?.runId ?? null;
                    importAlertIdRef.current = addAlert(
                        t('workspace_settings_integrations.tab.importing', {
                            counts: describeImportCounts(
                                {
                                    imported: 0,
                                    updated: 0,
                                    skipped: 0,
                                    failed: 0,
                                },
                                t,
                            ),
                        }),
                        'information',
                        0,
                    );

                    importPollTimerRef.current = setInterval(() => {
                        // 'flash' must always be included here too: shared
                        // props left out of a partial reload are never
                        // re-evaluated client-side, so omitting it would
                        // leave the last real flash message (from this
                        // action or any other) stuck in Inertia's local page
                        // props - and this reload's own 'success' router
                        // event (see AlertContext.tsx) would then re-show
                        // that same stale toast on every single poll tick.
                        router.reload({
                            only: ['jiraImportProgress', 'flash'],
                        });
                    }, IMPORT_POLL_INTERVAL_MS);
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.import_start_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const connectGithub = () => {
        if (!selectedProject) return;

        // Opened synchronously, still inside the click handler, so it's tied
        // to the user gesture and not blocked as a popup - the install URL
        // isn't known yet at this point, only after the POST below resolves,
        // so this tab starts blank and gets navigated once it is.
        // No 'noopener' here: with it window.open always returns null, so we
        // couldn't navigate the tab - the opener is cut by hand right away
        // instead, before the request below has a chance to stall or fail.
        const installTab = window.open('', '_blank');

        if (installTab) installTab.opener = null;

        if (!installTab) {
            addAlert(
                t('workspace_settings_integrations.tab.popup_blocked'),
                'error',
            );

            return;
        }

        router.post(
            route('projects.integrations.github.connect', [selectedProject.id]),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    const installUrl = githubStatusRef.current?.installUrl;

                    if (installUrl) {
                        installTab.location.href = installUrl;
                    } else {
                        installTab.close();
                    }

                    startGithubPolling();
                },
                onError: () => {
                    installTab.close();
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.github_connect_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const disconnectGithub = () => {
        if (!selectedProject) return;

        stopGithubPolling();

        router.post(
            route('projects.integrations.github.disconnect', [
                selectedProject.id,
            ]),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.github_disconnect_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const retryGithub = () => {
        if (!selectedProject) return;

        router.post(
            route('projects.integrations.github.retry', [selectedProject.id]),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.github_retry_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const [availableGithubRepositories, setAvailableGithubRepositories] =
        useState<GithubConnectedRepository[] | null>(null);
    const [
        isLoadingAvailableGithubRepositories,
        setIsLoadingAvailableGithubRepositories,
    ] = useState(false);
    // Whether the picker list has been requested (loading or loaded) - read
    // through a ref so a refresh callback sees the current value, not the one
    // captured when Refresh was clicked.
    const githubPickerRequestedRef = useRef(false);
    // Only the latest picker request may write its result, so an older
    // response that lands late can't overwrite a newer one.
    const githubPickerRequestIdRef = useRef(0);

    const openGithubRepositoryPicker = async () => {
        if (!selectedProject) return;

        const requestId = ++githubPickerRequestIdRef.current;

        githubPickerRequestedRef.current = true;
        setIsLoadingAvailableGithubRepositories(true);

        try {
            const response = await fetch(
                route('projects.integrations.github.repositories.available', [
                    selectedProject.id,
                ]),
                { headers: { Accept: 'application/json' } },
            );

            if (!response.ok) throw new Error('request failed');

            const data: { repositories: GithubConnectedRepository[] } =
                await response.json();

            if (requestId !== githubPickerRequestIdRef.current) return;

            setAvailableGithubRepositories(data.repositories);
        } catch {
            if (requestId !== githubPickerRequestIdRef.current) return;

            addAlert(
                t(
                    'workspace_settings_integrations.tab.repositories_load_failed',
                ),
                'error',
            );
            setAvailableGithubRepositories([]);
        } finally {
            if (requestId === githubPickerRequestIdRef.current) {
                setIsLoadingAvailableGithubRepositories(false);
            }
        }
    };

    const addGithubRepository = (repositoryId: number) => {
        if (!selectedProject) return;

        router.post(
            route('projects.integrations.github.repositories.store', [
                selectedProject.id,
            ]),
            { repository_id: repositoryId },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.repository_connected',
                        ),
                        'success',
                    );
                    githubPickerRequestedRef.current = false;
                    setAvailableGithubRepositories(null);
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.repository_connect_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const removeGithubRepository = (repositoryId: number) => {
        if (!selectedProject) return;

        router.delete(
            route('projects.integrations.github.repositories.destroy', [
                selectedProject.id,
                repositoryId,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.repository_disconnected',
                        ),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.repository_disconnect_failed',
                        ),
                        'error',
                    );
                },
            },
        );
    };

    const [isRefreshingGithubRepositories, setIsRefreshingGithubRepositories] =
        useState(false);

    const refreshGithubRepositories = () => {
        if (!selectedProject || isRefreshingGithubRepositories) return;

        setIsRefreshingGithubRepositories(true);

        router.post(
            route('projects.integrations.github.repositories.sync', [
                selectedProject.id,
            ]),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    // Reload a requested picker list instead of clearing it,
                    // so an open picker doesn't go empty or stay stale.
                    if (githubPickerRequestedRef.current) {
                        void openGithubRepositoryPicker();
                    }
                },
                onError: () => {
                    addAlert(
                        t(
                            'workspace_settings_integrations.tab.repositories_refresh_failed',
                        ),
                        'error',
                    );
                },
                onFinish: () => {
                    setIsRefreshingGithubRepositories(false);
                },
            },
        );
    };

    return {
        toggleIntegration,
        saveIntegrationSettings,
        connectImportIntegration,
        saveImportMappings,
        triggerImport,
        connectGithub,
        disconnectGithub,
        retryGithub,
        availableGithubRepositories,
        isLoadingAvailableGithubRepositories,
        openGithubRepositoryPicker,
        addGithubRepository,
        removeGithubRepository,
        refreshGithubRepositories,
        isRefreshingGithubRepositories,
    };
}
