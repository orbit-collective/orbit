import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { makePaginated } from '@/tests/paginated';
import ActivityFeedPanel from './ActivityFeedPanel';

vi.mock('@/Components/Organisms/ActivityLogs/ActivityLogs', () => ({
    default: ({ logs }: { logs: unknown[] }) => (
        <div data-testid="activity-logs" data-count={logs.length} />
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
});
