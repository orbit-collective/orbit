import { GithubConnectStatus } from '@/types/ProjectIntegrations';

interface WorkspaceSettingsGithubConnectPanelProps {
    canUpdate: boolean;
    status: GithubConnectStatus | null;
    onConnect: () => void;
    onDisconnect: () => void;
}

/**
 * The settings panel for the 'github' kind integration (see IntegrationKind
 * in Integrations.ts): a GitHub App installation flow, not a credential form
 * like an 'import' integration or a webhook URL like a 'notify' one. There
 * are no fields to fill in - "Connect with GitHub" opens the GitHub App
 * install page, and the connected repository is shown read-only afterward.
 */
export default function WorkspaceSettingsGithubConnectPanel({
    canUpdate,
    status,
    onConnect,
    onDisconnect,
}: WorkspaceSettingsGithubConnectPanelProps) {
    const state = status?.status ?? 'not_connected';

    return (
        <section className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--text-color)]">
                Connect
            </h3>

            {state === 'connected' && status?.repository ? (
                <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-[var(--border-color)] px-4 py-3">
                    <div>
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            {status.repository.owner}/{status.repository.name}
                        </p>
                        <p className="mt-0.5 text-sm text-[var(--text-gray-color)]">
                            Pull requests with an{' '}
                            <code>{'<!-- orbit-issue:ID -->'}</code> marker in
                            their description will be linked automatically.
                        </p>
                    </div>
                    {canUpdate && (
                        <button
                            type="button"
                            onClick={onDisconnect}
                            className="shrink-0 rounded-lg border border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] px-3 py-2 text-sm font-medium text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                        >
                            Disconnect
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
