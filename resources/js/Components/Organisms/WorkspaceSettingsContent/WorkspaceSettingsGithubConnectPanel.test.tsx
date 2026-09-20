import { GithubConnectStatus } from '@/types/ProjectIntegrations';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsGithubConnectPanel from './WorkspaceSettingsGithubConnectPanel';

const notConnected: GithubConnectStatus = {
    status: 'not_connected',
    installUrl: null,
    repository: null,
    connectedAt: null,
};

const pending: GithubConnectStatus = {
    status: 'pending',
    installUrl: 'https://github.com/apps/orbit/installations/new?state=xyz',
    repository: null,
    connectedAt: null,
};

const connected: GithubConnectStatus = {
    status: 'connected',
    installUrl: null,
    repository: { owner: 'orbit-collective', name: 'orbit' },
    connectedAt: '2026-09-20T00:00:00Z',
};

describe('WorkspaceSettingsGithubConnectPanel', () => {
    test('shows a Connect with GitHub button when not connected', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={notConnected}
                onConnect={() => {}}
                onDisconnect={() => {}}
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
                onDisconnect={() => {}}
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
                onConnect={() => {}}
                onDisconnect={() => {}}
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Reopen install page' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Waiting for/)).toBeInTheDocument();
    });

    test('shows the connected repository and a disconnect action', () => {
        const onDisconnect = vi.fn();

        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate
                status={connected}
                onConnect={() => {}}
                onDisconnect={onDisconnect}
            />,
        );

        expect(screen.getByText('orbit-collective/orbit')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

        expect(onDisconnect).toHaveBeenCalledTimes(1);
    });

    test('hides the disconnect button for a read-only viewer', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate={false}
                status={connected}
                onConnect={() => {}}
                onDisconnect={() => {}}
            />,
        );

        expect(
            screen.queryByRole('button', { name: 'Disconnect' }),
        ).not.toBeInTheDocument();
    });

    test('shows a static status line instead of a button for a read-only viewer', () => {
        render(
            <WorkspaceSettingsGithubConnectPanel
                canUpdate={false}
                status={notConnected}
                onConnect={() => {}}
                onDisconnect={() => {}}
            />,
        );

        expect(screen.getByText('Not connected yet.')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: 'Connect with GitHub' }),
        ).not.toBeInTheDocument();
    });
});
