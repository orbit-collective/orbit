import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import StatCard from './StatCard';

describe('StatCard Component', () => {
    test('renders the title and value', () => {
        render(<StatCard title="Open Issues" value={42} icon="Inbox" />);

        expect(screen.getByText('Open Issues')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
    });

    test('renders an icon (svg)', () => {
        const { container } = render(
            <StatCard title="Open" value={1} icon="Inbox" />,
        );

        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('renders a progress percentage when progress is provided', () => {
        render(<StatCard title="Done" value={5} icon="Check" progress={75} />);

        expect(screen.getByText('75%')).toBeInTheDocument();
    });

    test('renders a positive trend with a leading "+" and its label', () => {
        render(
            <StatCard
                title="Growth"
                value={10}
                icon="TrendingUp"
                trend={{ value: 12, label: 'vs last week', isPositive: true }}
            />,
        );

        expect(screen.getByText('+12%')).toBeInTheDocument();
        expect(screen.getByText('vs last week')).toBeInTheDocument();
    });

    test('renders a negative trend without a leading "+"', () => {
        render(
            <StatCard
                title="Decline"
                value={10}
                icon="TrendingDown"
                trend={{ value: 8, label: 'vs last week', isPositive: false }}
            />,
        );

        expect(screen.getByText('8%')).toBeInTheDocument();
        expect(screen.queryByText('+8%')).not.toBeInTheDocument();
    });

    test('renders the description as a tooltip next to the title', () => {
        const { container } = render(
            <StatCard
                title="Info"
                value={1}
                icon="Inbox"
                description="A helpful note"
            />,
        );

        expect(screen.getByText('A helpful note')).toBeInTheDocument();
        expect(container.querySelector('.lucide-info')).toBeInTheDocument();
    });

    test('does not render the info tooltip when there is no description', () => {
        const { container } = render(
            <StatCard title="Info" value={1} icon="Inbox" />,
        );

        expect(container.querySelector('.lucide-info')).not.toBeInTheDocument();
    });

    test('renders the description tooltip alongside a trend', () => {
        render(
            <StatCard
                title="Info"
                value={1}
                icon="Inbox"
                description="A helpful note"
                trend={{ value: 1, label: 'up', isPositive: true }}
            />,
        );

        expect(screen.getByText('A helpful note')).toBeInTheDocument();
        expect(screen.getByText('up')).toBeInTheDocument();
    });

    test.each([
        ['accent', 'text-[var(--accent-color)]'],
        ['success', 'text-[var(--success-color)]'],
        ['warning', 'text-[var(--warning-color)]'],
        ['error', 'text-[var(--error-color)]'],
        ['info', 'text-[var(--info-color)]'],
    ] as const)(
        'colors the progress badge for the %s color',
        (color, expectedClass) => {
            const { container } = render(
                <StatCard
                    title="Done"
                    value={5}
                    icon="Check"
                    progress={60}
                    color={color}
                />,
            );

            const badge = container.querySelector(
                `.${CSS.escape(expectedClass)}`,
            );
            expect(badge).toBeInTheDocument();
        },
    );

    test('applies the accent variant classes', () => {
        const { container } = render(
            <StatCard title="Accent" value={1} icon="Inbox" variant="accent" />,
        );

        expect(container.firstChild).toHaveClass(
            'border-[var(--accent-color)]',
        );
    });
});
