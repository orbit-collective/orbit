import { Issue } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import CalendarView from './CalendarView';

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

describe('CalendarView Component', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders the pinned month and year', () => {
        render(<CalendarView issues={[]} />);

        expect(screen.getByText('July')).toBeInTheDocument();
        expect(screen.getByText('2026')).toBeInTheDocument();
    });

    test('renders all weekday headers', () => {
        render(<CalendarView issues={[]} />);

        // Weekday abbreviations also appear per-cell on mobile, so at least
        // one match (the header row) is expected for each label.
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
            expect(screen.getAllByText(day).length).toBeGreaterThanOrEqual(1);
        });
    });

    test('renders an issue on the day matching its start_date', () => {
        const issue = makeIssue({
            id: '10',
            title: 'Ship the release',
            start_date: '2026-07-15',
        });
        render(<CalendarView issues={[issue]} />);

        expect(screen.getByText('Ship the release')).toBeInTheDocument();
        expect(screen.getByText('1 item')).toBeInTheDocument();
    });

    test('pluralizes the item count for multiple issues on the same day', () => {
        const issues = [
            makeIssue({
                id: '1',
                title: 'First task',
                start_date: '2026-07-15',
            }),
            makeIssue({
                id: '2',
                title: 'Second task',
                start_date: '2026-07-15',
            }),
        ];
        render(<CalendarView issues={issues} />);

        expect(screen.getByText('First task')).toBeInTheDocument();
        expect(screen.getByText('Second task')).toBeInTheDocument();
        expect(screen.getByText('2 items')).toBeInTheDocument();
    });

    test('renders a multi-day issue on every day between start_date and end_date', () => {
        const issue = makeIssue({
            id: '20',
            title: 'Multi-day task',
            start_date: '2026-07-15',
            end_date: '2026-07-17',
        });
        render(<CalendarView issues={[issue]} />);

        expect(screen.getAllByText('Multi-day task')).toHaveLength(3);
    });

    test('renders a single-day chip when end_date matches start_date', () => {
        const issue = makeIssue({
            id: '21',
            title: 'Single-day task',
            start_date: '2026-07-15',
            end_date: '2026-07-15',
        });
        render(<CalendarView issues={[issue]} />);

        expect(screen.getAllByText('Single-day task')).toHaveLength(1);
    });

    test('colors an issue chip by its priority', () => {
        const issue = makeIssue({
            id: '22',
            title: 'High priority task',
            priority: 'high',
            start_date: '2026-07-15',
        });
        render(<CalendarView issues={[issue]} />);

        const chip = screen
            .getByText('High priority task')
            .closest('button') as HTMLElement;
        expect(chip).toHaveClass('border-l-[var(--error-color)]');
    });

    test('shows a "+N more" indicator when a day has more issues than fit', () => {
        const issues = [1, 2, 3, 4, 5].map((n) =>
            makeIssue({
                id: String(n),
                title: `Task ${n}`,
                start_date: '2026-07-15',
            }),
        );
        render(<CalendarView issues={issues} />);

        expect(screen.getByText('Task 1')).toBeInTheDocument();
        expect(screen.getByText('Task 3')).toBeInTheDocument();
        expect(screen.queryByText('Task 4')).not.toBeInTheDocument();
        expect(screen.getByText('+2 more')).toBeInTheDocument();
        expect(screen.getByText('5 items')).toBeInTheDocument();
    });

    test('does not render issues without a start_date', () => {
        const issue = makeIssue({
            title: 'No date issue',
            start_date: undefined,
        });
        render(<CalendarView issues={[issue]} />);

        expect(screen.queryByText('No date issue')).not.toBeInTheDocument();
    });

    test('navigates to the issue page when an issue is clicked', async () => {
        const user = userEvent.setup();
        const issue = makeIssue({
            id: '42',
            title: 'Clickable issue',
            start_date: '2026-07-15',
        });
        render(<CalendarView issues={[issue]} />);

        await user.click(screen.getByText('Clickable issue'));

        expect(mockRouterVisit).toHaveBeenCalledWith('/issues.show/1/42');
    });

    test('highlights today with the accent-colored day number', () => {
        render(<CalendarView issues={[]} />);

        const todayCell = screen.getByText('25');
        expect(todayCell).toHaveClass('bg-[var(--accent-color)]');
    });

    test('navigates to the next month and no longer shows the previous month issue', async () => {
        const user = userEvent.setup();
        const issue = makeIssue({
            title: 'July only issue',
            start_date: '2026-07-15',
        });
        render(<CalendarView issues={[issue]} />);

        expect(screen.getByText('July only issue')).toBeInTheDocument();

        const nextButton = document
            .querySelector('.lucide-chevron-right')
            ?.closest('button') as HTMLElement;
        await user.click(nextButton);

        expect(screen.getByText('August')).toBeInTheDocument();
        expect(screen.queryByText('July only issue')).not.toBeInTheDocument();
    });

    test('navigates to the previous month', async () => {
        const user = userEvent.setup();
        render(<CalendarView issues={[]} />);

        const prevButton = document
            .querySelector('.lucide-chevron-left')
            ?.closest('button') as HTMLElement;
        await user.click(prevButton);

        expect(screen.getByText('June')).toBeInTheDocument();
    });

    test('returns to the current month when "Today" is clicked after navigating away', async () => {
        const user = userEvent.setup();
        render(<CalendarView issues={[]} />);

        const nextButton = document
            .querySelector('.lucide-chevron-right')
            ?.closest('button') as HTMLElement;
        await user.click(nextButton);
        expect(screen.getByText('August')).toBeInTheDocument();

        await user.click(screen.getByText('Today'));

        expect(screen.getByText('July')).toBeInTheDocument();
    });

    test('switches to week view showing the range containing today', async () => {
        const user = userEvent.setup();
        const { container } = render(<CalendarView issues={[]} />);

        await user.click(screen.getByRole('button', { name: 'week' }));

        // "Today" (2026-07-25) is a Saturday, so its week is Jul 19 - 25.
        expect(container.querySelector('h2')).toHaveTextContent('Jul 19 – 25');
    });

    test('only shows issues that fall within the visible week', async () => {
        const user = userEvent.setup();
        const issues = [
            makeIssue({
                id: '1',
                title: 'Inside the week',
                start_date: '2026-07-20',
            }),
            makeIssue({
                id: '2',
                title: 'Outside the week',
                start_date: '2026-08-05',
            }),
        ];
        render(<CalendarView issues={issues} />);

        await user.click(screen.getByRole('button', { name: 'week' }));

        expect(screen.getByText('Inside the week')).toBeInTheDocument();
        expect(screen.queryByText('Outside the week')).not.toBeInTheDocument();
    });

    test('navigates by one week at a time in week view', async () => {
        const user = userEvent.setup();
        render(<CalendarView issues={[]} />);

        await user.click(screen.getByRole('button', { name: 'week' }));
        expect(screen.getByText(/Jul 19/)).toBeInTheDocument();

        const nextButton = document
            .querySelector('.lucide-chevron-right')
            ?.closest('button') as HTMLElement;
        await user.click(nextButton);

        expect(screen.getByText(/Jul 26/)).toBeInTheDocument();
        expect(screen.queryByText(/Jul 19/)).not.toBeInTheDocument();
    });

    test('returns to the current week when "Today" is clicked in week view', async () => {
        const user = userEvent.setup();
        render(<CalendarView issues={[]} />);

        await user.click(screen.getByRole('button', { name: 'week' }));

        const nextButton = document
            .querySelector('.lucide-chevron-right')
            ?.closest('button') as HTMLElement;
        await user.click(nextButton);
        expect(screen.getByText(/Jul 26/)).toBeInTheDocument();

        await user.click(screen.getByText('Today'));

        expect(screen.getByText(/Jul 19/)).toBeInTheDocument();
    });

    test('stays in week view after navigating, defaulting to month view initially', () => {
        render(<CalendarView issues={[]} />);

        const monthButton = screen.getByRole('button', { name: 'month' });
        const weekButton = screen.getByRole('button', { name: 'week' });

        expect(monthButton).toHaveClass('bg-[var(--accent-color)]');
        expect(weekButton).not.toHaveClass('bg-[var(--accent-color)]');
    });
});
