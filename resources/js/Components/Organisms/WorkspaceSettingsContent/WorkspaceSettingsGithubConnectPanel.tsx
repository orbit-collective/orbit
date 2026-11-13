import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import {
    GithubConnectedRepository,
    GithubConnectStatus,
    GithubIntegrationHealth,
} from '@/types/ProjectIntegrations';
import { formatTimeAgo } from '@/utils/time';

interface WorkspaceSettingsGithubConnectPanelProps {
    canUpdate: boolean;
    status: GithubConnectStatus | null;
    onConnect: () => void;
    onDisconnect: () => void;
    onRetry: () => void;
    /** Fetches the installation's not-yet-connected repositories on demand - see WorkspaceSettingsIntegrationsTab. */
    onOpenRepositoryPicker?: () => void;
    availableRepositories?: GithubConnectedRepository[] | null;
    isLoadingAvailableRepositories?: boolean;
    onAddRepository?: (repositoryId: number) => void;
    onRemoveRepository?: (repositoryId: number) => void;
    /** Re-fetches the connected repository list from orbit-api - see GithubIntegrationService::syncRepositories. */
    onRefreshRepositories?: () => void;
    isRefreshingRepositories?: boolean;
}

const HEALTH_COLOR_CLASSES: Record<
    Exclude<GithubIntegrationHealth, null>,
    string
> = {
    healthy: 'bg-(--success-color)/15 text-(--success-color)',
    degraded: 'bg-(--warning-color)/15 text-(--warning-color)',
    error: 'bg-(--error-color)/15 text-(--error-color)',
    revoked: 'bg-(--pending-color)/15 text-(--pending-color)',
};

function HealthPill({ health }: { health: GithubIntegrationHealth }) {
    const { t } = useLaravelReactI18n();

    if (!health) return null;

    return (
        <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${HEALTH_COLOR_CLASSES[health]}`}
        >
            {t(`workspace_settings_integrations.github.health.${health}`)}
        </span>
    );
}

function GithubDiagnostics({ status }: { status: GithubConnectStatus }) {
    const { t } = useLaravelReactI18n();
    const ago = (value: string) =>
        t('workspace_settings_integrations.time_ago', {
            time: formatTimeAgo(value, t),
        });

    return (
        <details className="rounded-xl border border-(--border-color) px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-(--text-color)">
                {t('workspace_settings_integrations.github.diagnostics')}
            </summary>
            <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-(--text-gray-color)">
                <dt>
                    {t(
                        'workspace_settings_integrations.github.connection_status',
                    )}
                </dt>
                <dd>{status.status}</dd>
                <dt>
                    {t('workspace_settings_integrations.github.health_label')}
                </dt>
                <dd>{status.health ?? '—'}</dd>
                {status.repository && (
                    <>
                        <dt>
                            {t(
                                'workspace_settings_integrations.github.repository',
                            )}
                        </dt>
                        <dd>
                            {status.repository.owner}/{status.repository.name}
                        </dd>
                    </>
                )}
                <dt>
                    {t(
                        'workspace_settings_integrations.github.last_successful_sync',
                    )}
                </dt>
                <dd>
                    {status.lastSuccessfulSyncAt
                        ? ago(status.lastSuccessfulSyncAt)
                        : '—'}
                </dd>
                <dt>
                    {t(
                        'workspace_settings_integrations.github.last_sync_attempt',
                    )}
                </dt>
                <dd>
                    {status.lastSyncAttemptAt
                        ? ago(status.lastSyncAttemptAt)
                        : '—'}
                </dd>
                <dt>
                    {t('workspace_settings_integrations.github.last_failure')}
                </dt>
                <dd>
                    {status.lastFailedSyncAt
                        ? ago(status.lastFailedSyncAt)
                        : '—'}
                </dd>
                <dt>
                    {t('workspace_settings_integrations.github.pending_events')}
                </dt>
                <dd>
                    {status.pendingEventCount === null
                        ? '—'
                        : status.pendingEventCountCapped
                          ? `${status.pendingEventCount}+`
                          : status.pendingEventCount}
                </dd>
            </dl>
        </details>
    );
}

function ConnectedRepositories({
    canUpdate,
    repositories,
    availableRepositories,
    isLoadingAvailableRepositories,
    onOpenRepositoryPicker,
    onAddRepository,
    onRemoveRepository,
    onRefreshRepositories,
    isRefreshingRepositories = false,
}: {
    canUpdate: boolean;
    repositories: GithubConnectedRepository[];
    availableRepositories?: GithubConnectedRepository[] | null;
    isLoadingAvailableRepositories?: boolean;
    onOpenRepositoryPicker?: () => void;
    onAddRepository?: (repositoryId: number) => void;
    onRemoveRepository?: (repositoryId: number) => void;
    onRefreshRepositories?: () => void;
    isRefreshingRepositories?: boolean;
}) {
    const { t } = useLaravelReactI18n();
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    return (
        <div className="rounded-xl border border-(--border-color) px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-(--text-color)">
                    {t(
                        'workspace_settings_integrations.github.connected_repositories',
                    )}
                </p>
                <div className="flex items-center gap-2">
                    {canUpdate && onRefreshRepositories && (
                        <button
                            type="button"
                            onClick={onRefreshRepositories}
                            disabled={isRefreshingRepositories}
                            className="rounded-lg border border-(--bg-light-color) bg-(--bg-dark-color) px-3 py-1.5 text-sm font-medium text-(--text-color) transition-colors hover:border-(--border-color-strong) disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRefreshingRepositories
                                ? t(
                                      'workspace_settings_integrations.github.refreshing',
                                  )
                                : t(
                                      'workspace_settings_integrations.github.refresh',
                                  )}
                        </button>
                    )}
                    {canUpdate && onAddRepository && (
                        <button
                            type="button"
                            onClick={() => {
                                const next = !isPickerOpen;

                                setIsPickerOpen(next);

                                if (next) onOpenRepositoryPicker?.();
                            }}
                            className="rounded-lg border border-(--bg-light-color) bg-(--bg-dark-color) px-3 py-1.5 text-sm font-medium text-(--text-color) transition-colors hover:border-(--border-color-strong)"
                        >
                            {isPickerOpen
                                ? t('common.close')
                                : t(
                                      'workspace_settings_integrations.github.add_repository',
                                  )}
                        </button>
                    )}
                </div>
            </div>

            {repositories.length === 0 ? (
                <p className="mt-2 text-sm text-(--text-gray-color)">
                    {t(
                        'workspace_settings_integrations.github.no_repositories',
                    )}
                </p>
            ) : (
                <ul className="mt-2 space-y-1">
                    {repositories.map((repository) => (
                        <li
                            key={repository.id}
                            className="flex items-center justify-between gap-4 text-sm"
                        >
                            <span className="text-(--text-color)">
                                {repository.owner}/{repository.name}
                            </span>
                            {canUpdate && onRemoveRepository && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onRemoveRepository(repository.id)
                                    }
                                    className="text-(--text-gray-color) transition-colors hover:text-(--error-color)"
                                >
                                    {t('common.remove')}
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {isPickerOpen && canUpdate && (
                <div className="mt-3 border-t border-(--border-color) pt-3">
                    {isLoadingAvailableRepositories ? (
                        <p className="text-sm text-(--text-gray-color)">
                            {t('common.loading')}
                        </p>
                    ) : !availableRepositories ||
                      availableRepositories.length === 0 ? (
                        <p className="text-sm text-(--text-gray-color)">
                            {t(
                                'workspace_settings_integrations.github.no_other_repositories',
                            )}
                        </p>
                    ) : (
                        <ul className="space-y-1">
                            {availableRepositories.map((repository) => (
                                <li key={repository.id}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onAddRepository?.(repository.id);
                                            setIsPickerOpen(false);
                                        }}
                                        className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-(--text-color) transition-colors hover:bg-(--bg-light-color)"
                                    >
                                        {repository.owner}/{repository.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * The settings panel for the 'github' kind integration (see IntegrationKind
 * in Integrations.ts): a GitHub App installation flow, not a credential form
 * like an 'import' integration or a webhook URL like a 'notify' one. There
 * are no fields to fill in - "Connect with GitHub" opens the GitHub App
 * install page, and the connected repository is shown read-only afterward.
 *
 * Once connected, this also surfaces operational health (see
 * GithubIntegrationHealthService on the backend): a degraded sync offers
 * "Retry sync" (the same GithubIntegrationSynchronizer the scheduler uses),
 * while a permanent error (e.g. an invalid token) or a revoked connection
 * offers "Reconnect" instead - retrying with a broken token would just fail
 * again, only a fresh connection helps.
 */
export default function WorkspaceSettingsGithubConnectPanel({
    canUpdate,
    status,
    onConnect,
    onDisconnect,
    onRetry,
    onOpenRepositoryPicker,
    availableRepositories,
    isLoadingAvailableRepositories,
    onAddRepository,
    onRemoveRepository,
    onRefreshRepositories,
    isRefreshingRepositories,
}: WorkspaceSettingsGithubConnectPanelProps) {
    const { t } = useLaravelReactI18n();
    const ago = (value: string) =>
        t('workspace_settings_integrations.time_ago', {
            time: formatTimeAgo(value, t),
        });
    const state = status?.status ?? 'not_connected';
    const health = status?.health ?? null;

    return (
        <section className="mt-6">
            <h3 className="text-sm font-semibold text-(--text-color)">
                {t('workspace_settings_integrations.github.connect')}
            </h3>

            {state === 'connected' && status?.repository ? (
                <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-(--border-color) px-4 py-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-(--text-color)">
                                    {status.repository.owner}/
                                    {status.repository.name}
                                </p>
                                <HealthPill health={health} />
                            </div>
                            {health === 'healthy' && (
                                <p className="mt-0.5 text-sm text-(--text-gray-color)">
                                    {t(
                                        'workspace_settings_integrations.github.marker_before',
                                    )}{' '}
                                    <code>{'<!-- orbit-issue:ID -->'}</code>{' '}
                                    {t(
                                        'workspace_settings_integrations.github.marker_after',
                                    )}
                                </p>
                            )}
                            {(health === 'degraded' || health === 'error') &&
                                status.errorMessage && (
                                    <p className="mt-0.5 text-sm text-(--error-color)">
                                        {status.errorMessage}
                                    </p>
                                )}
                            {health === 'healthy' &&
                                status.lastSuccessfulSyncAt && (
                                    <p className="mt-1 text-xs text-(--text-gray-color)">
                                        {t(
                                            'workspace_settings_integrations.github.last_synced',
                                            {
                                                time: ago(
                                                    status.lastSuccessfulSyncAt,
                                                ),
                                            },
                                        )}
                                    </p>
                                )}
                            {health === 'degraded' && (
                                <p className="mt-1 text-xs text-(--text-gray-color)">
                                    {status.lastSuccessfulSyncAt &&
                                        t(
                                            'workspace_settings_integrations.github.last_successful_sync_inline',
                                            {
                                                time: ago(
                                                    status.lastSuccessfulSyncAt,
                                                ),
                                            },
                                        )}
                                    {status.lastSyncAttemptAt &&
                                        ` · ${t(
                                            'workspace_settings_integrations.github.last_attempt_inline',
                                            {
                                                time: ago(
                                                    status.lastSyncAttemptAt,
                                                ),
                                            },
                                        )}`}
                                </p>
                            )}
                        </div>
                        {canUpdate && (
                            <div className="flex shrink-0 items-center gap-2">
                                {health === 'degraded' && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="rounded-lg border border-(--bg-light-color) bg-(--bg-dark-color) px-3 py-2 text-sm font-medium text-(--text-color) transition-colors hover:border-(--border-color-strong)"
                                    >
                                        {t(
                                            'workspace_settings_integrations.github.retry_sync',
                                        )}
                                    </button>
                                )}
                                {health === 'error' && (
                                    <button
                                        type="button"
                                        onClick={onConnect}
                                        className="rounded-lg bg-(--accent-color) px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                    >
                                        {t(
                                            'workspace_settings_integrations.github.reconnect',
                                        )}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onDisconnect}
                                    className="rounded-lg border border-(--bg-light-color) bg-(--bg-dark-color) px-3 py-2 text-sm font-medium text-(--text-color) transition-colors hover:border-(--border-color-strong)"
                                >
                                    {t(
                                        'workspace_settings_integrations.github.disconnect',
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                    <ConnectedRepositories
                        canUpdate={canUpdate}
                        repositories={status.repositories}
                        availableRepositories={availableRepositories}
                        isLoadingAvailableRepositories={
                            isLoadingAvailableRepositories
                        }
                        onOpenRepositoryPicker={onOpenRepositoryPicker}
                        onAddRepository={onAddRepository}
                        onRemoveRepository={onRemoveRepository}
                        onRefreshRepositories={onRefreshRepositories}
                        isRefreshingRepositories={isRefreshingRepositories}
                    />
                    <GithubDiagnostics status={status} />
                </div>
            ) : state === 'revoked' ? (
                <div className="mt-3 space-y-3">
                    <p className="text-sm text-(--text-gray-color)">
                        {canUpdate
                            ? t(
                                  'workspace_settings_integrations.github.revoked_can_update',
                              )
                            : t(
                                  'workspace_settings_integrations.github.revoked',
                              )}
                    </p>
                    {canUpdate && (
                        <button
                            type="button"
                            onClick={onConnect}
                            className="rounded-lg bg-(--accent-color) px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                            {t(
                                'workspace_settings_integrations.github.reconnect',
                            )}
                        </button>
                    )}
                </div>
            ) : canUpdate ? (
                <div className="mt-3 space-y-3">
                    <p className="text-sm text-(--text-gray-color)">
                        {t('workspace_settings_integrations.github.intro')}
                    </p>
                    <button
                        type="button"
                        onClick={onConnect}
                        className="rounded-lg bg-(--accent-color) px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                        {state === 'pending'
                            ? t(
                                  'workspace_settings_integrations.github.reopen_install',
                              )
                            : t(
                                  'workspace_settings_integrations.github.connect_with_github',
                              )}
                    </button>
                    {state === 'pending' && (
                        <p className="text-sm text-(--text-gray-color)">
                            {t(
                                'workspace_settings_integrations.github.waiting',
                            )}
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-1 text-sm text-(--text-gray-color)">
                    {state === 'pending'
                        ? t('workspace_settings_integrations.github.pending')
                        : t(
                              'workspace_settings_integrations.github.not_connected',
                          )}
                </p>
            )}
        </section>
    );
}
