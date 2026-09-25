import { GithubConnectStatus } from '@/types/ProjectIntegrations';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsGithubConnectPanel from './WorkspaceSettingsGithubConnectPanel';

const notConnected: GithubConnectStatus = {
    status: 'not_connected',
    installUrl: null,
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
};

const pending: GithubConnectStatus = {
    ...notConnected,
    status: 'pending',
    installUrl: 'https://github.com/apps/orbit/installations/new?state=xyz',
};

const healthy: GithubConnectStatus = {
    ...notConnected,
    status: 'connected',
    repository: { owner: 'orbit-collective', name: 'orbit' },
    repositories: [{ id: 1, owner: 'orbit-collective', name: 'orbit' }],
    connectedAt: '2026-09-20T00:00:00Z',
    health: 'healthy',
    lastSuccessfulSyncAt: new Date(Date.now() - 2 * 60_000).toISOString(),
};

const degraded: GithubConnectStatus = {
    ...healthy,
    health: 'degraded',
    errorMessage: 'Orbit could not reach the GitHub relay service.',
    lastFailedSyncAt: new Date(Date.now() - 60_000).toISOString(),
    lastSyncAttemptAt: new Date(Date.now() - 60_000).toISOString(),
    pendingEventCount: 3,
};

const errorState: GithubConnectStatus = {
    ...healthy,
    health: 'error',
    errorMessage: 'Orbit no longer has access to this GitHub connection.',
};

const revoked: GithubConnectStatus = {
    ...notConnected,
    status: 'revoked',
    health: 'revoked',
};

const noop = () => {};

describe('WorkspaceSettingsGithubConnectPanel', () => {
    test('shows a Connect with GitHub button when not connected', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={notConnected}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Connect with GitHub' }),
        ).toBeInTheDocument();
    });

    test('calls onConnect when the connect button is clicked', () => {
        const onConnect = vi.fn();

        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={notConnected}
                onConnect={onConnect}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Connect with GitHub' }),
        );

        expect(onConnect).toHaveBeenCalledTimes(1);
    });

    test('shows a pending indicator and reopen action while pending', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={pending}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Reopen install page' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Waiting for/)).toBeInTheDocument();
    });

    test('shows the connected repository, a Healthy pill, and a disconnect action', () => {
        const onDisconnect = vi.fn();

        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={healthy}
                onConnect={noop}
                onDisconnect={onDisconnect}
                onRetry={noop}
            />,
        );

        expect(
            screen.getAllByText('orbit-collective/orbit').length,
        ).toBeGreaterThan(0);
        expect(screen.getByText('Healthy')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Retry sync' }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Reconnect' }),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

        expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    test('a degraded integration shows the safe error message and a Retry sync action', () => {
        const onRetry = vi.fn();

        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={degraded}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={onRetry}
            />,
        );

        expect(screen.getByText('Degraded')).toBeInTheDocument();
        expect(
            screen.getByText('Orbit could not reach the GitHub relay service.'),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Retry sync' }));

        expect(onRetry).toHaveBeenCalledTimes(1);
    });

    test('an integration in an error state shows a Reconnect action instead of Retry sync', () => {
        const onConnect = vi.fn();

        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={errorState}
                onConnect={onConnect}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        expect(screen.getByText('Needs attention')).toBeInTheDocument();
        expect(
            screen.getByText(
                'Orbit no longer has access to this GitHub connection.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Retry sync' }),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));

        expect(onConnect).toHaveBeenCalledTimes(1);
    });

    test('a revoked connection shows a Reconnect action and no Disconnect button', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={revoked}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Reconnect' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Disconnect' }),
        ).not.toBeInTheDocument();
    });

    test('the diagnostics section lists the pending event count with a "+" when capped', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={degraded}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        fireEvent.click(screen.getByText('Diagnostics'));

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('hides the disconnect button for a read-only viewer', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate={false}
                status={healthy}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Disconnect' }),
        ).not.toBeInTheDocument();
    });

    test('lists connected repositories and removes one', () => {
        const onRemoveRepository = vi.fn();
        const multiRepo: GithubConnectStatus = {
            ...healthy,
            repositories: [
                { id: 1, owner: 'orbit-collective', name: 'orbit' },
                { id: 2, owner: 'orbit-collective', name: 'orbit-api' },
            ],
        };

        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={multiRepo}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
                onRemoveRepository={onRemoveRepository}
            />,
        );

        expect(
            screen.getByText('orbit-collective/orbit-api'),
        ).toBeInTheDocument();

        fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[1]);

        expect(onRemoveRepository).toHaveBeenCalledWith(2);
    });

    test('opens the repository picker, fetches available repositories, and adds one', () => {
        const onOpenRepositoryPicker = vi.fn();
        const onAddRepository = vi.fn();

        const { rerender } = render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={healthy}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
                onOpenRepositoryPicker={onOpenRepositoryPicker}
                onAddRepository={onAddRepository}
                availableRepositories={null}
                isLoadingAvailableRepositories={false}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Add repository' }));

        expect(onOpenRepositoryPicker).toHaveBeenCalledTimes(1);

        rerender(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={healthy}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
                onOpenRepositoryPicker={onOpenRepositoryPicker}
                onAddRepository={onAddRepository}
                availableRepositories={[
                    { id: 2, owner: 'orbit-collective', name: 'orbit-api' },
                ]}
                isLoadingAvailableRepositories={false}
            />,
        );

        fireEvent.click(screen.getByText('orbit-collective/orbit-api'));

        expect(onAddRepository).toHaveBeenCalledWith(2);
    });

    test('shows a static status line instead of a button for a read-only viewer', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate={false}
                status={notConnected}
                onConnect={noop}
                onDisconnect={noop}
                onRetry={noop}
            />,
        );

        expect(screen.getByText('Not connected yet.')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Connect with GitHub' }),
        ).not.toBeInTheDocument();
    });
});
