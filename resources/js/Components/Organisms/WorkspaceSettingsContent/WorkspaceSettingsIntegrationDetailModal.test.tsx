import { INTEGRATIONS } from '@/types/Integrations';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIntegrationDetailModal from './WorkspaceSettingsIntegrationDetailModal';

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;
const slack = INTEGRATIONS.find((integration) => integration.id === 'slack')!;

describe('WorkspaceSettingsIntegrationDetailModal', () => {
    test('renders nothing when there is no integration', () => {
        const { container } = render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={null}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('renders the integration overview and options', () => {
        const { container } = render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(screen.getByText(discord.category)).toBeInTheDocument();
        expect(container.textContent).toContain('mirror activity from Orbit');
        expect(container.querySelector('strong')?.textContent).toBe(
            'What you get:',
        );
        expect(container.querySelectorAll('li').length).toBeGreaterThan(0);
        expect(
            screen.getByText(discord.previewSamples[0].title),
        ).toBeInTheDocument();
        expect(
            screen.getByText(discord.subOptions[0].title),
        ).toBeInTheDocument();
    });

    test('shows a "Connect" action for an available integration and calls onToggle', async () => {
        const onToggle = vi.fn();
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={onToggle}
                onClose={() => {}}
            />,
        );

        await userEvent.click(screen.getByText('Connect'));

        expect(onToggle).toHaveBeenCalledWith(true);
    });

    test('shows a "Connected" action and enables the option toggles once the integration is on', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled
                canUpdate
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('Connected')).toBeInTheDocument();
        const optionToggles = screen.getAllByRole('button', { name: '' });
        expect(optionToggles[0]).not.toBeDisabled();
    });

    test('shows a read-only "Connected" status when the integration is on but the viewer cannot update it', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled
                canUpdate={false}
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    test('shows "Coming soon" instead of a connect action for a locked integration', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={slack}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('Coming soon')).toBeInTheDocument();
        expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    test('links to the official website in a new tab', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        const link = screen.getByRole('link', {
            name: 'Visit the Discord website',
        });

        expect(link).toHaveAttribute('href', discord.websiteUrl);
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    test('shows a read-only status instead of a connect action when the viewer cannot update integrations', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate={false}
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('Not connected')).toBeInTheDocument();
        expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    test('the close button calls onClose', async () => {
        const onClose = vi.fn();
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onClose={onClose}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
