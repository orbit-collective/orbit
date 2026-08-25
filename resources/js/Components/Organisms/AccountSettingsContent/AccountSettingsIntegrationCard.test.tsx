import { INTEGRATIONS } from '@/types/Integrations';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsIntegrationCard from './AccountSettingsIntegrationCard';

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;
const slack = INTEGRATIONS.find((integration) => integration.id === 'slack')!;

describe('AccountSettingsIntegrationCard', () => {
    test('renders the integration name, vendor, and description', () => {
        render(
            <AccountSettingsIntegrationCard
                integration={discord}
                enabled={false}
                onToggle={() => {}}
                onOpen={() => {}}
            />,
        );

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(screen.getByText(discord.vendor)).toBeInTheDocument();
        expect(screen.getByText(discord.description)).toBeInTheDocument();
        expect(screen.getByText(discord.category)).toBeInTheDocument();
    });

    test('shows a "New" badge and an enabled toggle for an available integration', () => {
        render(
            <AccountSettingsIntegrationCard
                integration={discord}
                enabled={false}
                onToggle={() => {}}
                onOpen={() => {}}
            />,
        );

        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '' })).not.toBeDisabled();
    });

    test('shows a "Soon" badge and a disabled toggle for a locked integration', () => {
        render(
            <AccountSettingsIntegrationCard
                integration={slack}
                enabled={false}
                onToggle={() => {}}
                onOpen={() => {}}
            />,
        );

        expect(screen.getByText('Soon')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '' })).toBeDisabled();
    });

    test('clicking the card calls onOpen', async () => {
        const onOpen = vi.fn();
        render(
            <AccountSettingsIntegrationCard
                integration={discord}
                enabled={false}
                onToggle={() => {}}
                onOpen={onOpen}
            />,
        );

        await userEvent.click(screen.getByRole('heading', { name: 'Discord' }));

        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    test('clicking the toggle calls onToggle without triggering onOpen', async () => {
        const onOpen = vi.fn();
        const onToggle = vi.fn();
        render(
            <AccountSettingsIntegrationCard
                integration={discord}
                enabled={false}
                onToggle={onToggle}
                onOpen={onOpen}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: '' }));

        expect(onToggle).toHaveBeenCalledWith(true);
        expect(onOpen).not.toHaveBeenCalled();
    });
});
