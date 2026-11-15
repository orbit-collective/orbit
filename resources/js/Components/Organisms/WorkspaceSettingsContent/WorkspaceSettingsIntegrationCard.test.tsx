import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { INTEGRATIONS } from '@/types/Integrations';
import WorkspaceSettingsIntegrationCard from './WorkspaceSettingsIntegrationCard';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
    }: {
        children: React.ReactNode;
        href: string;
        className?: string;
    }) => (
        <a href={href} className={className}>
            {children}
        </a>
    ),
}));

const discord = INTEGRATIONS.find(
    (integration) => integration.id === 'discord',
)!;
const slack = INTEGRATIONS.find((integration) => integration.id === 'slack')!;

const renderCard = (
    props: Partial<Parameters<typeof WorkspaceSettingsIntegrationCard>[0]> = {},
) =>
    render(
        <WorkspaceSettingsIntegrationCard
            integration={discord}
            enabled={false}
            canUpdate
            href="/settings/integrations/discord?project=1"
            onToggle={() => {}}
            {...props}
        />,
    );

describe('WorkspaceSettingsIntegrationCard', () => {
    test('renders the integration name, vendor, and description', () => {
        renderCard();

        expect(
            screen.getByRole('heading', { name: 'Discord' }),
        ).toBeInTheDocument();
        expect(screen.getByText(discord.vendor)).toBeInTheDocument();
        expect(screen.getByText(discord.description)).toBeInTheDocument();
        expect(screen.getByText(discord.category)).toBeInTheDocument();
    });

    test('the name links to the integration page', () => {
        renderCard();

        expect(screen.getByRole('link', { name: 'Discord' })).toHaveAttribute(
            'href',
            '/settings/integrations/discord?project=1',
        );
    });

    test('shows a "Disabled" badge and a named switch for an available integration', () => {
        renderCard();

        expect(screen.getByText('Disabled')).toBeInTheDocument();
        expect(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        ).not.toBeDisabled();
    });

    test('shows an "Enabled" badge and the switch on when enabled', () => {
        renderCard({ enabled: true });

        expect(screen.getByText('Enabled')).toBeInTheDocument();
        expect(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        ).toBeChecked();
    });

    test('shows a "Soon" badge and a disabled switch for a locked integration', () => {
        renderCard({ integration: slack });

        expect(screen.getByText('Soon')).toBeInTheDocument();
        expect(
            screen.getByRole('switch', { name: 'Toggle Slack' }),
        ).toBeDisabled();
    });

    test('the switch calls onToggle', async () => {
        const onToggle = vi.fn();
        renderCard({ onToggle });

        await userEvent.click(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        );

        expect(onToggle).toHaveBeenCalledWith(true);
    });

    test('the switch and the link are separate Tab stops', async () => {
        renderCard();

        await userEvent.tab();
        expect(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        ).toHaveFocus();

        await userEvent.tab();
        expect(screen.getByRole('link', { name: 'Discord' })).toHaveFocus();
    });

    test('disables the switch when the viewer cannot update integrations', () => {
        renderCard({ canUpdate: false });

        expect(
            screen.getByRole('switch', { name: 'Toggle Discord' }),
        ).toBeDisabled();
    });

    test('has no switch for an integration without a plain toggle', () => {
        renderCard({ onToggle: undefined });

        expect(screen.queryByRole('switch')).toBeNull();
    });

    describe('as a row', () => {
        test('keeps the link, the state and the switch of the card', async () => {
            const onToggle = vi.fn();
            renderCard({ variant: 'row', onToggle, enabled: true });

            expect(
                screen.getByRole('link', { name: 'Discord' }),
            ).toHaveAttribute(
                'href',
                '/settings/integrations/discord?project=1',
            );
            expect(screen.getByText('Enabled')).toBeInTheDocument();
            expect(screen.getByText(discord.description)).toBeInTheDocument();

            await userEvent.click(
                screen.getByRole('switch', { name: 'Toggle Discord' }),
            );

            expect(onToggle).toHaveBeenCalledWith(false);
        });

        test('a locked integration is marked soon and its switch is off limits', () => {
            renderCard({ variant: 'row', integration: slack });

            expect(screen.getByText('Soon')).toBeInTheDocument();
            expect(
                screen.getByRole('switch', { name: 'Toggle Slack' }),
            ).toBeDisabled();
        });

        test('is one line, not the tall card', () => {
            const { container } = renderCard({ variant: 'row' });

            expect(container.firstChild).toHaveClass('items-center');
            expect(container.firstChild).not.toHaveClass('flex-col');
        });
    });
});
