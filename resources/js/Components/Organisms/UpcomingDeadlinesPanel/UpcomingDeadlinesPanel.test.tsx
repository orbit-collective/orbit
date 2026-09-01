import { Issue } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import UpcomingDeadlinesPanel from './UpcomingDeadlinesPanel';

const mockRouterVisit = vi.fn();
vi.mock('@inertiajs/react', () => ({
    router: { visit: (...args: unknown[]) => mockRouterVisit(...args) },
}));

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: unknown) =>
            `/${name}/${Array.isArray(params) ? params.join('/') : params}`,
    ),
);

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '1',
    title: 'Fix login bug',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

describe('UpcomingDeadlinesPanel Component', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders the panel title and count', () => {
        const issue = makeIssue({ end_date: '2026-07-30' });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.getByText('Upcoming Deadlines')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('renders an empty state when there are no upcoming deadlines', () => {
        render(<UpcomingDeadlinesPanel issues={[]} />);

        expect(screen.getByText('No upcoming deadlines')).toBeInTheDocument();
    });

    test('excludes issues without an end_date', () => {
        const issue = makeIssue({ title: 'No deadline', end_date: undefined });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.queryByText('No deadline')).not.toBeInTheDocument();
        expect(screen.getByText('No upcoming deadlines')).toBeInTheDocument();
    });

    test('excludes closed issues even with a near end_date', () => {
        const issue = makeIssue({
            title: 'Already done',
            status: 'closed',
            end_date: '2026-07-26',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.queryByText('Already done')).not.toBeInTheDocument();
    });

    test('sorts issues by nearest end_date first', () => {
        const issues = [
            makeIssue({
                id: '1',
                title: 'Later task',
                end_date: '2026-08-10',
            }),
            makeIssue({
                id: '2',
                title: 'Sooner task',
                end_date: '2026-07-27',
            }),
        ];
        render(<UpcomingDeadlinesPanel issues={issues} />);

        const titles = screen
            .getAllByRole('button')
            .map((button) => button.textContent);
        expect(titles[0]).toContain('Sooner task');
        expect(titles[1]).toContain('Later task');
    });

    test('labels an overdue issue in red', () => {
        const issue = makeIssue({
            title: 'Overdue task',
            end_date: '2026-07-20',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        const label = screen.getByText('Overdue by 5 days');
        expect(label).toHaveClass('text-[var(--error-color)]');
    });

    test('labels a due-today issue', () => {
        const issue = makeIssue({
            title: 'Today task',
            end_date: '2026-07-25',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.getByText('Due today')).toBeInTheDocument();
    });

    test('labels a due-tomorrow issue', () => {
        const issue = makeIssue({
            title: 'Tomorrow task',
            end_date: '2026-07-26',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.getByText('Due tomorrow')).toBeInTheDocument();
    });

    test('labels an issue due within the week as "Due in N days"', () => {
        const issue = makeIssue({
            title: 'This week task',
            end_date: '2026-07-29',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.getByText('Due in 4 days')).toBeInTheDocument();
    });

    test('falls back to a short date beyond a week out', () => {
        const issue = makeIssue({
            title: 'Far out task',
            end_date: '2026-09-01',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        expect(screen.getByText('Sep 1, 2026')).toBeInTheDocument();
    });

    test('renders the assignee avatar when present', () => {
        const issue = makeIssue({
            end_date: '2026-07-27',
            assignee: {
                id: 5,
                name: 'Jane Doe',
                avatar: '/storage/avatars/jane.jpg',
                email: 'jane@example.com',
                created_at: '',
                updated_at: '',
            },
        });
        const { container } = render(
            <UpcomingDeadlinesPanel issues={[issue]} />,
        );

        expect(
            container.querySelector('img[src="/storage/avatars/jane.jpg"]'),
        ).not.toBeNull();
    });

    test('navigates to the issue page when a deadline is clicked', async () => {
        const user = userEvent.setup();
        const issue = makeIssue({
            id: '42',
            project_id: 3,
            end_date: '2026-07-27',
        });
        render(<UpcomingDeadlinesPanel issues={[issue]} />);

        await user.click(screen.getByRole('button'));

        expect(mockRouterVisit).toHaveBeenCalledWith('/issues.show/3/42');
    });
});
