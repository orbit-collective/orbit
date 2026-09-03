import { INTEGRATIONS } from '@/types/Integrations';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIntegrationCard from './WorkspaceSettingsIntegrationCard';

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;
const slack = INTEGRATIONS.find((integration) => integration.id === 'slack')!;

describe('WorkspaceSettingsIntegrationCard', () => {
    test('renders the integration name, vendor, and description', () => {
        render(
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate
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

    test('shows a "Disabled" badge and an enabled toggle for an available integration', () => {
        render(
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onOpen={() => {}}
            />,
        );

        expect(screen.getByText('Disabled')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '' })).not.toBeDisabled();
    });

    test('shows a "Soon" badge and a disabled toggle for a locked integration', () => {
        render(
            <WorkspaceSettingsIntegrationCard
                integration={slack}
                enabled={false}
                canUpdate
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
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate
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
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={onToggle}
                onOpen={onOpen}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: '' }));

        expect(onToggle).toHaveBeenCalledWith(true);
        expect(onOpen).not.toHaveBeenCalled();
    });

    test('pressing Enter or Space on the focused card calls onOpen', async () => {
        const onOpen = vi.fn();
        render(
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onOpen={onOpen}
            />,
        );

        const card = screen.getByRole('button', { name: /Discord/ });
        card.focus();

        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(' ');

        expect(onOpen).toHaveBeenCalledTimes(2);
    });

    test('disables the toggle for an available integration when the viewer cannot update integrations', () => {
        render(
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate={false}
                onToggle={() => {}}
                onOpen={() => {}}
            />,
        );

        expect(screen.getByRole('button', { name: '' })).toBeDisabled();
    });

    test('pressing an unrelated key on the card does not call onOpen', async () => {
        const onOpen = vi.fn();
        render(
            <WorkspaceSettingsIntegrationCard
                integration={discord}
                enabled={false}
                canUpdate
                onToggle={() => {}}
                onOpen={onOpen}
            />,
        );

        const card = screen.getByRole('button', { name: /Discord/ });
        card.focus();

        await userEvent.keyboard('{Tab}');

        expect(onOpen).not.toHaveBeenCalled();
    });
});
