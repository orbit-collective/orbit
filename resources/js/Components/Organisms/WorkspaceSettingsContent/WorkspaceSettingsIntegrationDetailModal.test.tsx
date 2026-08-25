import { INTEGRATIONS } from '@/types/Integrations';
import { ProjectIntegrationSettings } from '@/types/ProjectIntegrations';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIntegrationDetailModal from './WorkspaceSettingsIntegrationDetailModal';

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;
const slack = INTEGRATIONS.find((integration) => integration.id === 'slack')!;

const emptySettings: ProjectIntegrationSettings = {
    enabled: false,
    hasWebhookUrl: false,
    webhookUrl: null,
    options: {},
};

const configuredSettings: ProjectIntegrationSettings = {
    enabled: true,
    hasWebhookUrl: true,
    webhookUrl: 'https://discord.com/api/webhooks/123456789012345678/aBcDeF',
    options: { 'issue-activity': true, 'comment-activity': false },
};

const noop = () => {};

describe('WorkspaceSettingsIntegrationDetailModal', () => {
    test('renders nothing when there is no integration', () => {
        const { container } = render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={null}
                enabled={false}
                canUpdate
                settings={null}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
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
                settings={emptySettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
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
                settings={emptySettings}
                onToggle={onToggle}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        await userEvent.click(screen.getByText('Connect'));

        expect(onToggle).toHaveBeenCalledWith(true);
    });

    test('shows a "Connected" action once the integration is on', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled
                canUpdate
                settings={configuredSettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    test('option toggles are enabled for an editor even before the integration is connected', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate
                settings={emptySettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        const optionToggles = screen.getAllByRole('button', { name: '' });
        expect(optionToggles[0]).not.toBeDisabled();
    });

    test('toggling an option calls onToggleOption with its id and the new checked state', async () => {
        const onToggleOption = vi.fn();
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled
                canUpdate
                settings={configuredSettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={onToggleOption}
                onClose={noop}
            />,
        );

        const optionToggles = screen.getAllByRole('button', { name: '' });
        await userEvent.click(optionToggles[0]);
        await userEvent.click(optionToggles[1]);

        expect(onToggleOption).toHaveBeenCalledWith('issue-activity', false);
        expect(onToggleOption).toHaveBeenCalledWith('comment-activity', true);
    });

    test('shows a read-only "Connected" status when the integration is on but the viewer cannot update it', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled
                canUpdate={false}
                settings={configuredSettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    test('lets an editor type and save a webhook url', async () => {
        const onSaveWebhookUrl = vi.fn();
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                canUpdate
                settings={emptySettings}
                onToggle={noop}
                onSaveWebhookUrl={onSaveWebhookUrl}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        const input = screen.getByPlaceholderText(
            'https://discord.com/api/webhooks/…',
        );
        const saveButton = screen.getByRole('button', { name: 'Save' });

        expect(saveButton).toBeDisabled();

        await userEvent.type(input, 'https://discord.com/api/webhooks/1/abc');

        expect(saveButton).not.toBeDisabled();

        await userEvent.click(saveButton);

        expect(onSaveWebhookUrl).toHaveBeenCalledWith(
            'https://discord.com/api/webhooks/1/abc',
        );
    });

    test('hides the webhook url input and shows a masked status for a viewer who cannot update integrations', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={discord}
                enabled
                canUpdate={false}
                settings={configuredSettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        expect(
            screen.queryByPlaceholderText('https://discord.com/api/webhooks/…'),
        ).not.toBeInTheDocument();
        expect(
            screen.getByText('A webhook URL is configured.'),
        ).toBeInTheDocument();
    });

    test('does not render a webhook url section for a locked integration', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={slack}
                enabled={false}
                canUpdate
                settings={null}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
            />,
        );

        expect(screen.queryByText('Webhook URL')).not.toBeInTheDocument();
    });

    test('shows "Coming soon" instead of a connect action for a locked integration', () => {
        render(
            <WorkspaceSettingsIntegrationDetailModal
                integration={slack}
                enabled={false}
                canUpdate
                settings={null}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
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
                settings={emptySettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
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
                settings={emptySettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={noop}
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
                settings={emptySettings}
                onToggle={noop}
                onSaveWebhookUrl={noop}
                onToggleOption={noop}
                onClose={onClose}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
