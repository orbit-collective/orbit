import { INTEGRATIONS } from '@/types/Integrations';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsIntegrationDetailModal from './AccountSettingsIntegrationDetailModal';

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;
const slack = INTEGRATIONS.find((integration) => integration.id === 'slack')!;

describe('AccountSettingsIntegrationDetailModal', () => {
    test('renders nothing when there is no integration', () => {
        const { container } = render(
            <AccountSettingsIntegrationDetailModal
                integration={null}
                enabled={false}
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('renders the integration overview and options', () => {
        const { container } = render(
            <AccountSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(screen.getByText(discord.category)).toBeInTheDocument();
        expect(container.textContent).toContain('mirror activity from Orbit');
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
            <AccountSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                onToggle={onToggle}
                onClose={() => {}}
            />,
        );

        await userEvent.click(screen.getByText('Connect'));

        expect(onToggle).toHaveBeenCalledWith(true);
    });

    test('shows "Coming soon" instead of a connect action for a locked integration', () => {
        render(
            <AccountSettingsIntegrationDetailModal
                integration={slack}
                enabled={false}
                onToggle={() => {}}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('Coming soon')).toBeInTheDocument();
        expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    });

    test('the close button calls onClose', async () => {
        const onClose = vi.fn();
        render(
            <AccountSettingsIntegrationDetailModal
                integration={discord}
                enabled={false}
                onToggle={() => {}}
                onClose={onClose}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
