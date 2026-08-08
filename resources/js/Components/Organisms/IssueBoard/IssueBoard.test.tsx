import { Issue } from '@/types/Issues';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import IssueBoard from './IssueBoard';

const mockAddAlert = vi.hoisted(() => vi.fn());
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: mockAddAlert,
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

const mockRouterPatch = vi.hoisted(() => vi.fn());
const mockRouterVisit = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({
    router: { patch: mockRouterPatch, visit: mockRouterVisit },
}));

const mockRoute = vi.hoisted(() =>
    vi.fn((name: string, id?: string | number) => `/${name}/${id ?? ''}`),
);

// Real pointer-drag simulation is unreliable in jsdom (no real layout/geometry
// for dnd-kit's collision detection), so we mock @dnd-kit/core just enough to
// capture the onDragEnd handler IssueBoard registers and invoke it directly —
// that's where all the actual "which field gets patched" logic lives.
const capturedHandlers = vi.hoisted<{
    onDragEnd?: (event: unknown) => void;
}>(() => ({}));

vi.mock('@dnd-kit/core', async () => {
    const actual =
        await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
    return {
        ...actual,
        DndContext: ({
            children,
            onDragEnd,
        }: {
            children: ReactNode;
            onDragEnd?: (event: unknown) => void;
        }) => {
            capturedHandlers.onDragEnd = onDragEnd;
            return children;
        },
        useDroppable: () => ({ setNodeRef: () => {}, isOver: false }),
    };
});

beforeEach(() => {
    vi.stubGlobal('route', mockRoute);
    localStorage.clear();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

let counter = 0;
const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: `ISSUE-${counter++}`,
    title: 'Some issue',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

describe('IssueBoard Component', () => {
    test('renders a column for each of the three priorities', () => {
        render(<IssueBoard issues={[]} />);

        expect(screen.getByText(/high Priority/i)).toBeInTheDocument();
        expect(screen.getByText(/medium Priority/i)).toBeInTheDocument();
        expect(screen.getByText(/low Priority/i)).toBeInTheDocument();
    });

    test('groups each issue into the column matching its priority', () => {
        const issues = [
            makeIssue({ title: 'A high one', priority: 'high' }),
            makeIssue({ title: 'A medium one', priority: 'medium' }),
            makeIssue({ title: 'A low one', priority: 'low' }),
        ];
        render(<IssueBoard issues={issues} />);

        // Every priority's issue is rendered somewhere on the board.
        expect(screen.getByText('A high one')).toBeInTheDocument();
        expect(screen.getByText('A medium one')).toBeInTheDocument();
        expect(screen.getByText('A low one')).toBeInTheDocument();
    });

    test('shows an empty state in columns that have no issues', () => {
        const issues = [makeIssue({ title: 'Only high', priority: 'high' })];
        render(<IssueBoard issues={issues} />);

        // The high column has an issue; medium and low are empty.
        expect(screen.getAllByText('No issues')).toHaveLength(2);
    });

    test('ignores issues whose priority is not one of the three columns', () => {
        const issues = [
            makeIssue({ title: 'A high one', priority: 'high' }),
            // A priority that has no matching column is silently skipped.
            makeIssue({
                title: 'An orphan',
                priority: 'urgent' as Issue['priority'],
            }),
        ];
        render(<IssueBoard issues={issues} />);

        expect(screen.getByText('A high one')).toBeInTheDocument();
        expect(screen.queryByText('An orphan')).not.toBeInTheDocument();
    });

    test('places an issue under the correct priority column', () => {
        const issues = [makeIssue({ title: 'A low one', priority: 'low' })];
        render(<IssueBoard issues={issues} />);

        // Find the "low Priority" column and confirm the issue lives within it.
        const lowHeading = screen.getByText(/low Priority/i);
        const column = lowHeading.closest('div')?.parentElement?.parentElement
            ?.parentElement?.parentElement as HTMLElement;
        expect(within(column).getByText('A low one')).toBeInTheDocument();
    });

    test('the count badge reflects only non-closed issues in that priority', () => {
        const issues = [
            makeIssue({ priority: 'high', status: 'open' }),
            makeIssue({ priority: 'high', status: 'open' }),
            makeIssue({ priority: 'high', status: 'closed' }),
        ];
        render(<IssueBoard issues={issues} />);

        // 2 open of 3 total in the High column => badge shows "2".
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('defaults to grouping by priority', () => {
        render(<IssueBoard issues={[]} />);

        expect(screen.getByRole('button', { name: 'Priority' })).toHaveClass(
            'bg-[var(--bg-light-color-hover)]',
        );
    });

    test('switching to Status regroups issues into Open/In Progress/Done columns', async () => {
        const user = userEvent.setup();
        const issues = [
            makeIssue({ title: 'Not started', status: 'open' }),
            makeIssue({ title: 'Underway', status: 'in_progress' }),
            makeIssue({ title: 'Finished', status: 'closed' }),
        ];
        render(<IssueBoard issues={issues} />);

        await user.click(screen.getByRole('button', { name: 'Status' }));

        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Done')).toBeInTheDocument();
        expect(screen.getByText('Not started')).toBeInTheDocument();
        expect(screen.getByText('Underway')).toBeInTheDocument();
        expect(screen.getByText('Finished')).toBeInTheDocument();
        // Priority-only columns are gone once grouped by status.
        expect(screen.queryByText(/high Priority/i)).not.toBeInTheDocument();
    });

    test('persists the chosen grouping mode to localStorage and restores it', async () => {
        const user = userEvent.setup();
        const { unmount } = render(<IssueBoard issues={[]} />);

        await user.click(screen.getByRole('button', { name: 'Status' }));
        expect(localStorage.getItem('boardGroupBy')).toBe('status');
        unmount();

        render(<IssueBoard issues={[]} />);

        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.queryByText(/high Priority/i)).not.toBeInTheDocument();
    });

    test('dragging a card to a new priority column patches priority', () => {
        const issue = makeIssue({ priority: 'low' });
        render(<IssueBoard issues={[issue]} />);

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'high' },
        });

        expect(mockRoute).toHaveBeenCalledWith('issues.update', issue.id);
        expect(mockRouterPatch).toHaveBeenCalledWith(
            expect.any(String),
            { priority: 'high' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('dragging a card to a new status column patches status instead of priority', async () => {
        const user = userEvent.setup();
        const issue = makeIssue({ status: 'open' });
        render(<IssueBoard issues={[issue]} />);

        await user.click(screen.getByRole('button', { name: 'Status' }));

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'in_progress' },
        });

        expect(mockRouterPatch).toHaveBeenCalledWith(
            expect.any(String),
            { status: 'in_progress' },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('reverts the optimistic update and alerts on a failed drag patch', () => {
        mockRouterPatch.mockImplementation(
            (_url, _data, opts?: { onError?: () => void }) => {
                opts?.onError?.();
            },
        );
        const issue = makeIssue({ priority: 'low', title: 'Flaky issue' });
        render(<IssueBoard issues={[issue]} />);

        capturedHandlers.onDragEnd?.({
            active: { id: issue.id },
            over: { id: 'high' },
        });

        expect(mockAddAlert).toHaveBeenCalledWith(
            'Failed to update issue priority',
            'error',
        );
        // Reverted back to its original "low" column.
        const lowHeading = screen.getByText(/low Priority/i);
        const column = lowHeading.closest('div')?.parentElement?.parentElement
            ?.parentElement?.parentElement as HTMLElement;
        expect(within(column).getByText('Flaky issue')).toBeInTheDocument();
    });
});
