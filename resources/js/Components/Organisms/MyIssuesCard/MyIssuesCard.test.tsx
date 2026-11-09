import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { makeIssueRow } from '@/tests/dashboardIssues';
import MyIssuesCard from './MyIssuesCard';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
        'aria-label': label,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
        'aria-label'?: string;
    }) => (
        <a href={href} className={className} aria-label={label}>
            {children}
        </a>
    ),
}));

const NOW = new Date(2026, 10, 10, 12, 0);
const high = {
    id: 1,
    name: 'High',
    color: '#f44336',
    icon: 'SignalHigh',
    position: 0,
};
const low = {
    id: 3,
    name: 'Low',
    color: '#4caf50',
    icon: 'SignalLow',
    position: 2,
};

const issues = [
    makeIssueRow(1, {
        title: 'Low and soon',
        priority: low,
        endDate: '2026-11-11',
        updatedAt: '2026-11-01T10:00:00Z',
    }),
    makeIssueRow(2, {
        title: 'High and late',
        priority: high,
        endDate: '2026-11-20',
        updatedAt: '2026-11-02T10:00:00Z',
    }),
    makeIssueRow(3, {
        title: 'No priority',
        priority: null,
        endDate: null,
        updatedAt: '2026-11-05T10:00:00Z',
    }),
];

const titles = () =>
    screen.getAllByRole('link').map((link) => link.getAttribute('aria-label'));

describe('MyIssuesCard', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('is a titled card with a list of the issues named for assistive technology', () => {
        render(<MyIssuesCard issues={issues} now={NOW} />);

        expect(screen.getByText('My Issues')).toBeInTheDocument();
        expect(
            screen.getByRole('list', { name: 'Open issues assigned to you' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('link')).toHaveLength(3);
    });

    test('says how many of the open issues are shown', () => {
        render(<MyIssuesCard issues={issues} limit={2} now={NOW} />);

        expect(screen.getByText('2 of 3 open')).toBeInTheDocument();
        expect(screen.getAllByRole('link')).toHaveLength(2);
    });

    test.each([
        [
            'priority',
            ['#12 High and late', '#11 Low and soon', '#13 No priority'],
        ],
        ['due', ['#11 Low and soon', '#12 High and late', '#13 No priority']],
        [
            'updated',
            ['#13 No priority', '#12 High and late', '#11 Low and soon'],
        ],
    ] as const)('orders by %s', (sort, expected) => {
        render(
            <MyIssuesCard
                issues={issues}
                sort={sort}
                now={NOW}
                show={{ project: false, priority: false }}
            />,
        );

        expect(titles().map((name) => name?.split(',')[0])).toEqual(expected);
    });

    test('can leave its title out', () => {
        render(<MyIssuesCard issues={issues} showHeader={false} now={NOW} />);

        expect(screen.queryByText('My Issues')).not.toBeInTheDocument();
    });

    test('passes on what to show of each issue', () => {
        render(
            <MyIssuesCard
                issues={issues}
                show={{ due: false, project: false }}
                now={NOW}
            />,
        );

        expect(screen.queryByTestId('due-chip')).not.toBeInTheDocument();
        expect(screen.queryByText('Orbit')).not.toBeInTheDocument();
    });

    test('the compact style has tighter rows and the cards style has tiles', () => {
        const { rerender } = render(
            <MyIssuesCard issues={issues} variant="compact" now={NOW} />,
        );
        expect(screen.getAllByRole('link')[0]).toHaveClass('min-h-8');

        rerender(<MyIssuesCard issues={issues} variant="cards" now={NOW} />);
        expect(screen.getAllByRole('link')[0]).toHaveClass('flex-col');
    });

    test.each([
        [300, 1],
        [450, 2],
        [700, 3],
    ])(
        'the cards fit as many columns as the width allows (%ipx: %i)',
        (width, columns) => {
            vi.spyOn(
                HTMLElement.prototype,
                'clientWidth',
                'get',
            ).mockReturnValue(width);

            render(<MyIssuesCard issues={issues} variant="cards" now={NOW} />);

            expect(screen.getByRole('list').style.gridTemplateColumns).toBe(
                `repeat(${columns}, minmax(0, 1fr))`,
            );
        },
    );

    test('a narrow card drops the projects', () => {
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(
            300,
        );

        render(<MyIssuesCard issues={issues} now={NOW} />);

        expect(screen.queryByText('Orbit')).not.toBeInTheDocument();
    });

    test('says so when nothing is assigned', () => {
        render(<MyIssuesCard issues={[]} now={NOW} />);

        expect(
            screen.getByText('Nothing is waiting for you'),
        ).toBeInTheDocument();
        expect(screen.getByText('Nothing assigned')).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    test('says so when the limit is zero', () => {
        render(<MyIssuesCard issues={issues} limit={0} now={NOW} />);

        expect(
            within(document.body).getByText('Nothing is waiting for you'),
        ).toBeInTheDocument();
    });
});
