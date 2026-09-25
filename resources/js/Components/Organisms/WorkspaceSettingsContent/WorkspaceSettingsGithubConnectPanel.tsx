import {
    GithubConnectedRepository,
    GithubConnectStatus,
    GithubIntegrationHealth,
} from '@/types/ProjectIntegrations';
import { formatTimeAgo } from '@/utils/time';
import { useState } from 'react';

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
}

const HEALTH_LABELS: Record<Exclude<GithubIntegrationHealth, null>, string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    error: 'Needs attention',
    revoked: 'Disconnected',
};

const HEALTH_COLOR_CLASSES: Record<
    Exclude<GithubIntegrationHealth, null>,
    string
> = {
    healthy: 'bg-[var(--success-color)]/15 text-[var(--success-color)]',
    degraded: 'bg-[var(--warning-color)]/15 text-[var(--warning-color)]',
    error: 'bg-[var(--error-color)]/15 text-[var(--error-color)]',
    revoked: 'bg-[var(--pending-color)]/15 text-[var(--pending-color)]',
};

function HealthPill({ health }: { health: GithubIntegrationHealth }) {
    if (!health) return null;

    return (
        <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${HEALTH_COLOR_CLASSES[health]}`}
        >
            {HEALTH_LABELS[health]}
        </span>
    );
}

function GithubDiagnostics({ status }: { status: GithubConnectStatus }) {
    return (
        <details className="rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm">
            <summary className="cursor-pointer font-medium text-[var(--text-color)]">
                Diagnostics
            </summary>
            <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-[var(--text-gray-color)]">
                <dt>Connection status</dt>
                <dd>{status.status}</dd>
                <dt>Health</dt>
                <dd>{status.health ?? '—'}</dd>
                {status.repository && (
                    <>
                        <dt>Repository</dt>
                        <dd>
                            {status.repository.owner}/{status.repository.name}
                        </dd>
                    </>
                )}
                <dt>Last successful sync</dt>
                <dd>
                    {status.lastSuccessfulSyncAt
                        ? `${formatTimeAgo(status.lastSuccessfulSyncAt)} ago`
                        : '—'}
                </dd>
                <dt>Last sync attempt</dt>
                <dd>
                    {status.lastSyncAttemptAt
                        ? `${formatTimeAgo(status.lastSyncAttemptAt)} ago`
                        : '—'}
                </dd>
                <dt>Last failure</dt>
                <dd>
                    {status.lastFailedSyncAt
                        ? `${formatTimeAgo(status.lastFailedSyncAt)} ago`
                        : '—'}
                </dd>
                <dt>Pending events</dt>
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
}: {
    canUpdate: boolean;
    repositories: GithubConnectedRepository[];
    availableRepositories?: GithubConnectedRepository[] | null;
    isLoadingAvailableRepositories?: boolean;
    onOpenRepositoryPicker?: () => void;
    onAddRepository?: (repositoryId: number) => void;
    onRemoveRepository?: (repositoryId: number) => void;
}) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    return (
        <div className="rounded-xl border border-[var(--border-color)] px-4 py-3">
            <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-[var(--text-color)]">
                    Connected repositories
                </p>
                {canUpdate && onAddRepository && (
                    <button
                        type="button"
                        onClick={() => {
                            const next = !isPickerOpen;

                            setIsPickerOpen(next);

                            if (next) onOpenRepositoryPicker?.();
                        }}
                        className="rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-1.5 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                    >
                        {isPickerOpen ? 'Close' : 'Add repository'}
                    </button>
                )}
            </div>

            {repositories.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text-gray-color)]">
                    No repositories connected.
                </p>
            ) : (
                <ul className="mt-2 space-y-1">
                    {repositories.map((repository) => (
                        <li
                            key={repository.id}
                            className="flex items-center justify-between gap-4 text-sm"
                        >
                            <span className="text-[var(--text-color)]">
                                {repository.owner}/{repository.name}
                            </span>
                            {canUpdate && onRemoveRepository && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onRemoveRepository(repository.id)
                                    }
                                    className="text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                >
                                    Remove
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {isPickerOpen && canUpdate && (
                <div className="mt-3 border-t border-[var(--border-color)] pt-3">
                    {isLoadingAvailableRepositories ? (
                        <p className="text-sm text-[var(--text-gray-color)]">
                            Loading…
                        </p>
                    ) : !availableRepositories ||
                      availableRepositories.length === 0 ? (
                        <p className="text-sm text-[var(--text-gray-color)]">
                            No other repositories are accessible to this
                            installation.
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
                                        className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)]"
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
}: WorkspaceSettingsGithubConnectPanelProps) {
    const state = status?.status ?? 'not_connected';
    const health = status?.health ?? null;

    return (
        <section className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--text-color)]">
                Connect
            </h3>

            {state === 'connected' && status?.repository ? (
                <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] px-4 py-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-[var(--text-color)]">
                                    {status.repository.owner}/
                                    {status.repository.name}
                                </p>
                                <HealthPill health={health} />
                            </div>
                            {health === 'healthy' && (
                                <p className="mt-0.5 text-sm text-[var(--text-gray-color)]">
                                    Pull requests with an{' '}
                                    <code>{'<!-- orbit-issue:ID -->'}</code>{' '}
                                    marker in their description will be linked
                                    automatically.
                                </p>
                            )}
                            {(health === 'degraded' || health === 'error') &&
                                status.errorMessage && (
                                    <p className="mt-0.5 text-sm text-[var(--error-color)]">
                                        {status.errorMessage}
                                    </p>
                                )}
                            {health === 'healthy' &&
                                status.lastSuccessfulSyncAt && (
                                    <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                                        Last synced:{' '}
                                        {formatTimeAgo(
                                            status.lastSuccessfulSyncAt,
                                        )}{' '}
                                        ago
                                    </p>
                                )}
                            {health === 'degraded' && (
                                <p className="mt-1 text-xs text-[var(--text-gray-color)]">
                                    {status.lastSuccessfulSyncAt &&
                                        `Last successful sync: ${formatTimeAgo(status.lastSuccessfulSyncAt)} ago`}
                                    {status.lastSyncAttemptAt &&
                                        ` · Last attempt: ${formatTimeAgo(status.lastSyncAttemptAt)} ago`}
                                </p>
                            )}
                        </div>
                        {canUpdate && (
                            <div className="flex shrink-0 items-center gap-2">
                                {health === 'degraded' && (
                                    <button
                                        type="button"
                                        onClick={onRetry}
                                        className="rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-2 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                                    >
                                        Retry sync
                                    </button>
                                )}
                                {health === 'error' && (
                                    <button
                                        type="button"
                                        onClick={onConnect}
                                        className="rounded-lg bg-[var(--accent-color)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                                    >
                                        Reconnect
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onDisconnect}
                                    className="rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-2 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                                >
                                    Disconnect
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
                    />
                    <GithubDiagnostics status={status} />
                </div>
            ) : state === 'revoked' ? (
                <div className="mt-3 space-y-3">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        {canUpdate
                            ? 'The GitHub connection was disconnected. Reconnect to resume linking pull requests.'
                            : 'The GitHub connection was disconnected.'}
                    </p>
                    {canUpdate && (
                        <button
                            type="button"
                            onClick={onConnect}
                            className="rounded-lg bg-[var(--accent-color)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                        >
                            Reconnect
                        </button>
                    )}
                </div>
            ) : canUpdate ? (
                <div className="mt-3 space-y-3">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        Connect a GitHub repository to link pull requests to
                        Orbit issues via a hidden marker in the pull request's
                        description.
                    </p>
                    <button
                        type="button"
                        onClick={onConnect}
                        className="rounded-lg bg-[var(--accent-color)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                    >
                        {state === 'pending'
                            ? 'Reopen install page'
                            : 'Connect with GitHub'}
                    </button>
                    {state === 'pending' && (
                        <p className="text-sm text-[var(--text-gray-color)]">
                            Waiting for the GitHub App installation to finish…
                        </p>
                    )}
                </div>
            ) : (
                <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                    {state === 'pending'
                        ? 'A connection is pending.'
                        : 'Not connected yet.'}
                </p>
            )}
        </section>
    );
}
