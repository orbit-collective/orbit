import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { makePaginated } from '@/tests/paginated';
import ActivityFeedPanel from './ActivityFeedPanel';

vi.mock('@/Components/Organisms/ActivityLogs/ActivityLogs', () => ({
    default: ({ logs, compact }: { logs: unknown[]; compact?: boolean }) => (
        <div
            data-testid="activity-logs"
            data-count={logs.length}
            data-compact={String(Boolean(compact))}
        />
    ),
}));

vi.mock('@/Components/Molecules/Pagination/Pagination', () => ({
    default: ({
        pageParam,
        defaultPerPage,
        total,
    }: {
        pageParam: string;
        defaultPerPage: number;
        total: number;
    }) => (
        <div
            data-testid="pagination"
            data-page-param={pageParam}
            data-per-page={defaultPerPage}
            data-total={total}
        />
    ),
}));

describe('ActivityFeedPanel', () => {
    test('lists the logs and pages them with the activity params', () => {
        render(
            <ActivityFeedPanel
                activityLogs={makePaginated([{ id: 1 }, { id: 2 }] as never[])}
                users={[]}
                issueTypes={[]}
                queryParams={{}}
            />,
        );

        expect(screen.getByText('Recent Work Activity')).toBeInTheDocument();
        expect(screen.getByTestId('activity-logs')).toHaveAttribute(
            'data-count',
            '2',
        );
        expect(screen.getByTestId('pagination')).toHaveAttribute(
            'data-per-page',
            '10',
        );
    });

    test('compact is passed on to the list of activity', () => {
        render(
            <ActivityFeedPanel
                activityLogs={makePaginated([])}
                users={[]}
                issueTypes={[]}
                queryParams={{}}
                compact
            />,
        );

        expect(screen.getByTestId('activity-logs')).toHaveAttribute(
            'data-compact',
            'true',
        );
    });

    test('the title and the pagination can be hidden', () => {
        render(
            <ActivityFeedPanel
                activityLogs={makePaginated([])}
                users={[]}
                issueTypes={[]}
                queryParams={{}}
                showHeader={false}
                showPagination={false}
            />,
        );

        expect(
            screen.queryByText('Recent Work Activity'),
        ).not.toBeInTheDocument();
        expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    });
});
