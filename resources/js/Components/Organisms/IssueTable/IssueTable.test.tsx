import { Issue } from '@/types/Issues';
import { Project } from '@/types/Projects';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import IssueTable from './IssueTable';

vi.stubGlobal(
    'route',
    vi.fn((name: string, params?: unknown) => `/${name}/${params ?? ''}`),
);

const mockAddAlert = vi.fn();

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: mockAddAlert,
    }),
}));

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({
        getIfAnyModalIsOpened: vi.fn(() => false),
    }),
}));

vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: () => ({
        triggerShortcut: vi.fn(),
    }),
}));

vi.mock('@inertiajs/react', () => {
    const mockRouterGet = vi.fn();
    const mockRouterPatch = vi.fn(
        (_url: string, _data?: unknown, opts?: { onSuccess?: () => void }) =>
            opts?.onSuccess?.(),
    );
    const mockRouterDelete = vi.fn(
        (
            _url: string,
            opts?: {
                onSuccess?: () => void;
                onError?: () => void;
                onFinish?: () => void;
            },
        ) => opts?.onSuccess?.(),
    );
    const mockRouterVisit = vi.fn();
    return {
        Link: ({
            children,
            href,
            className,
        }: {
            children: React.ReactNode;
            href?: string;
            className?: string;
        }) => (
            <a href={href} className={className}>
                {children}
            </a>
        ),
        router: {
            get: mockRouterGet,
            patch: mockRouterPatch,
            delete: mockRouterDelete,
            visit: mockRouterVisit,
        },
    };
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

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
    ...overrides,
});

describe('IssueTable Component', () => {
    beforeEach(() => {
        counter = 0;
        vi.clearAllMocks();
    });

    test('renders the column headers', () => {
        render(<IssueTable issues={[]} />);

        expect(
            screen.getByRole('columnheader', { name: 'ID' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Title' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Priority' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Status' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Assignee' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('columnheader', { name: 'Labels' }),
        ).toBeInTheDocument();
    });

    test('renders a row for each issue', () => {
        const issues = [
            makeIssue({ title: 'First issue' }),
            makeIssue({ title: 'Second issue' }),
        ];
        render(<IssueTable issues={issues} />);

        expect(screen.getByText('First issue')).toBeInTheDocument();
        expect(screen.getByText('Second issue')).toBeInTheDocument();
    });

    test('shows the empty state when there are no issues', () => {
        render(<IssueTable issues={[]} />);

        expect(screen.getByText('All done!')).toBeInTheDocument();
    });

    test('does not show the empty state when there are issues', () => {
        render(<IssueTable issues={[makeIssue({ title: 'An issue' })]} />);

        expect(screen.queryByText('All done!')).not.toBeInTheDocument();
    });

    test('sorts by column on header click', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        render(<IssueTable issues={[]} queryParams={{}} />);

        const titleHeader = screen.getByRole('columnheader', { name: 'Title' });
        await user.click(titleHeader);

        expect(router.get).toHaveBeenCalledWith(
            window.location.pathname,
            expect.objectContaining({
                sort: 'title',
                direction: 'AZ',
            }),
            expect.any(Object),
        );
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Sorting by title ascending',
            'information',
        );
    });

    test('toggles sort direction on same column click with AZ direction', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');

        render(
            <IssueTable
                issues={[]}
                queryParams={{ sort: 'title', direction: 'AZ' }}
            />,
        );

        const titleHeader = screen.getByRole('columnheader', { name: 'Title' });
        await user.click(titleHeader);

        expect(router.get).toHaveBeenCalledWith(
            window.location.pathname,
            expect.objectContaining({
                sort: 'title',
                direction: 'ZA',
            }),
            expect.any(Object),
        );
    });

    test('toggles sort direction on same column click with ZA direction', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');

        render(
            <IssueTable
                issues={[]}
                queryParams={{ sort: 'title', direction: 'ZA' }}
            />,
        );

        const titleHeader = screen.getByRole('columnheader', { name: 'Title' });
        await user.click(titleHeader);

        expect(router.get).toHaveBeenCalledWith(
            window.location.pathname,
            expect.objectContaining({
                sort: 'title',
                direction: 'AZ',
            }),
            expect.any(Object),
        );
    });

    test('renders sort indicator when column is sorted AZ', () => {
        render(
            <IssueTable
                issues={[]}
                queryParams={{ sort: 'title', direction: 'AZ' }}
            />,
        );

        const titleHeader = screen.getByRole('columnheader', { name: 'Title' });
        expect(titleHeader).toBeInTheDocument();
    });

    test('renders sort indicator when column is sorted ZA', () => {
        render(
            <IssueTable
                issues={[]}
                queryParams={{ sort: 'title', direction: 'ZA' }}
            />,
        );

        const titleHeader = screen.getByRole('columnheader', { name: 'Title' });
        expect(titleHeader).toBeInTheDocument();
    });

    test('handles undefined query params gracefully', () => {
        render(<IssueTable issues={[]} queryParams={undefined} />);

        expect(
            screen.getByRole('columnheader', { name: 'ID' }),
        ).toBeInTheDocument();
    });

    test('handles sort correctly when queryParams is undefined', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        render(<IssueTable issues={[]} queryParams={undefined} />);

        const titleHeader = screen.getByRole('columnheader', { name: 'Title' });
        await user.click(titleHeader);

        // Should NOT call router.get because queryParams is undefined
        expect(router.get).not.toHaveBeenCalled();
        expect(mockAddAlert).not.toHaveBeenCalled();
    });

    test('renders its own card chrome by default', () => {
        const { container } = render(<IssueTable issues={[]} />);

        expect(container.querySelector('.shadow-xl')).toBeInTheDocument();
    });

    test('omits its own card chrome when bare is set', () => {
        const { container } = render(<IssueTable issues={[]} bare />);

        expect(container.querySelector('.shadow-xl')).not.toBeInTheDocument();
    });

    test('renders table with proper structure', () => {
        const { container } = render(<IssueTable issues={[]} />);

        const table = container.querySelector('table');
        expect(table).toBeInTheDocument();

        const thead = container.querySelector('thead');
        expect(thead).toBeInTheDocument();

        const tbody = container.querySelector('tbody');
        expect(tbody).toBeInTheDocument();
    });

    test('renders empty state with correct description', () => {
        render(<IssueTable issues={[]} />);

        expect(screen.getByText('All done!')).toBeInTheDocument();
        expect(
            screen.getByText(
                /No issues found in this view. Everything is completed or no tasks have been assigned yet./,
            ),
        ).toBeInTheDocument();
    });

    test('renders a single issue row', () => {
        const issue = makeIssue({
            title: 'Some Issue',
            id: 'ISSUE-999',
        });
        render(<IssueTable issues={[issue]} />);

        expect(screen.getByText('Some Issue')).toBeInTheDocument();
    });

    test('renders unsorted header icons for non-active columns', () => {
        render(
            <IssueTable
                issues={[]}
                queryParams={{ sort: 'title', direction: 'AZ' }}
            />,
        );

        const idHeader = screen.getByRole('columnheader', { name: 'ID' });
        expect(idHeader).toBeInTheDocument();
    });

    test('handles multiple issues', () => {
        const issues = [];
        for (let i = 0; i < 10; i++) {
            issues.push(makeIssue({ title: `Issue ${i}` }));
        }

        render(<IssueTable issues={issues} />);

        for (let i = 0; i < 10; i++) {
            expect(screen.getByText(`Issue ${i}`)).toBeInTheDocument();
        }
    });

    test('header has correct styling classes', () => {
        const { container } = render(
            <IssueTable issues={[]} queryParams={{}} />,
        );

        // We only check sortable headers (ID, Title, etc.)
        // Skip the first (checkbox) and last two (spacer, settings) th
        const headerCells = Array.from(container.querySelectorAll('th')).slice(
            1,
            -2,
        );
        expect(headerCells.length).toBeGreaterThan(0);
        headerCells.forEach((cell) => {
            expect(cell).toHaveClass('group', 'cursor-pointer', 'select-none');
        });
    });

    test('toggles all issues when clicking the header checkbox', async () => {
        const user = userEvent.setup();
        const issues = [
            makeIssue({ title: 'Issue 1', id: 'ISSUE-1' }),
            makeIssue({ title: 'Issue 2', id: 'ISSUE-2' }),
        ];

        render(<IssueTable issues={issues} />);

        const headerCheckbox = screen.getAllByRole('checkbox')[0];
        const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);

        // Initial state: none selected
        expect(headerCheckbox).not.toBeChecked();
        rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());

        // Click header checkbox -> select all
        await user.click(headerCheckbox);
        expect(headerCheckbox).toBeChecked();
        rowCheckboxes.forEach((cb) => expect(cb).toBeChecked());

        // Click header checkbox again -> deselect all
        await user.click(headerCheckbox);
        expect(headerCheckbox).not.toBeChecked();
        rowCheckboxes.forEach((cb) => expect(cb).not.toBeChecked());
    });

    test('toggles individual issues correctly', async () => {
        const user = userEvent.setup();
        const issues = [
            makeIssue({ title: 'Issue 1', id: 'ISSUE-1' }),
            makeIssue({ title: 'Issue 2', id: 'ISSUE-2' }),
        ];

        render(<IssueTable issues={issues} />);

        const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);

        // Select first issue
        await user.click(rowCheckboxes[0]);
        expect(rowCheckboxes[0]).toBeChecked();
        expect(rowCheckboxes[1]).not.toBeChecked();

        // Select second issue
        await user.click(rowCheckboxes[1]);
        expect(rowCheckboxes[0]).toBeChecked();
        expect(rowCheckboxes[1]).toBeChecked();

        // Deselect first issue
        await user.click(rowCheckboxes[0]);
        expect(rowCheckboxes[0]).not.toBeChecked();
        expect(rowCheckboxes[1]).toBeChecked();
    });

    test('bulk-deletes selected issues and shows a success alert', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        const issues = [
            makeIssue({ title: 'Issue 1', id: 'ISSUE-1' }),
            makeIssue({ title: 'Issue 2', id: 'ISSUE-2' }),
        ];

        render(<IssueTable issues={issues} />);

        const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);
        await user.click(rowCheckboxes[0]);

        await user.click(screen.getByText('Delete Selected'));

        expect(router.delete).toHaveBeenCalledWith(
            '/issues/bulk-destroy',
            expect.objectContaining({
                data: { ids: ['ISSUE-1'] },
                preserveScroll: true,
            }),
        );
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Successfully removed 1 items',
            'success',
        );
        expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument();
    });

    test('shows an error alert when the bulk delete request fails', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        (
            router.delete as unknown as ReturnType<typeof vi.fn>
        ).mockImplementationOnce(
            (
                _url: string,
                opts?: { onError?: () => void; onFinish?: () => void },
            ) => {
                opts?.onError?.();
                opts?.onFinish?.();
            },
        );

        const issues = [makeIssue({ title: 'Issue 1', id: 'ISSUE-1' })];

        render(<IssueTable issues={issues} />);

        const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);
        await user.click(rowCheckboxes[0]);

        await user.click(screen.getByText('Delete Selected'));

        expect(mockAddAlert).toHaveBeenCalledWith(
            'An error occurred while deleting',
            'error',
        );
        // Selection is preserved on error (only cleared in onSuccess).
        expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    });

    test('resizes a column when its resize handle is dragged', () => {
        const { container } = render(<IssueTable issues={[]} />);

        const titleHeader = container.querySelector(
            'th[data-column="title"]',
        ) as HTMLElement;
        const handle = titleHeader.querySelector(
            '[class*="cursor-col-resize"]',
        ) as HTMLElement;

        fireEvent.mouseDown(handle, { clientX: 100 });
        fireEvent.mouseMove(window, { clientX: 300 });
        fireEvent.mouseUp(window);

        expect(titleHeader).toHaveStyle({ width: '300px' });
    });

    test('stops a click on the resize handle from also triggering a column sort', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        const { container } = render(
            <IssueTable issues={[]} queryParams={{}} />,
        );

        const titleHeader = container.querySelector(
            'th[data-column="title"]',
        ) as HTMLElement;
        const handle = titleHeader.querySelector(
            '[class*="cursor-col-resize"]',
        ) as HTMLElement;

        await user.click(handle);

        expect(router.get).not.toHaveBeenCalled();
    });

    test('clamps a column resize to the minimum width', () => {
        const { container } = render(<IssueTable issues={[]} />);

        const titleHeader = container.querySelector(
            'th[data-column="title"]',
        ) as HTMLElement;
        const handle = titleHeader.querySelector(
            '[class*="cursor-col-resize"]',
        ) as HTMLElement;

        fireEvent.mouseDown(handle, { clientX: 100 });
        fireEvent.mouseMove(window, { clientX: 10 });
        fireEvent.mouseUp(window);

        expect(titleHeader).toHaveStyle({ width: '80px' });
    });

    test('resizes the row height when the row-height handle is dragged', () => {
        const issues = [makeIssue({ title: 'Issue 1', id: 'ISSUE-1' })];
        const { container } = render(<IssueTable issues={issues} />);

        const handle = container.querySelector(
            '[class*="cursor-row-resize"]',
        ) as HTMLElement;

        fireEvent.mouseDown(handle, { clientY: 0 });
        fireEvent.mouseMove(window, { clientY: 90 });
        fireEvent.mouseUp(window);

        const row = container.querySelector('tbody tr') as HTMLElement;
        expect(row).toHaveStyle({ height: '90px' });
    });

    test('auto-fits a column width on double-clicking its resize handle', () => {
        // jsdom does not implement canvas 2D contexts, so `getContext`
        // normally returns null; stub it so the measureText branch runs too.
        const measureTextSpy = vi
            .spyOn(HTMLCanvasElement.prototype, 'getContext')
            .mockReturnValue({
                font: '',
                measureText: () => ({ width: 500 }),
            } as unknown as CanvasRenderingContext2D);

        const issues = [makeIssue({ title: 'A very long issue title' })];
        const { container } = render(<IssueTable issues={issues} />);

        const titleHeader = container.querySelector(
            'th[data-column="title"]',
        ) as HTMLElement;
        const handle = titleHeader.querySelector(
            '[class*="cursor-col-resize"]',
        ) as HTMLElement;

        fireEvent.doubleClick(handle);

        // measured width (500) + 48 padding, clamped to the 800 maximum.
        expect(titleHeader).toHaveStyle({ width: '548px' });

        measureTextSpy.mockRestore();
    });

    test('auto-fits to the default width when canvas measurement is unavailable', () => {
        const issues = [makeIssue({ title: 'Issue 1' })];
        const { container } = render(<IssueTable issues={issues} />);

        const titleHeader = container.querySelector(
            'th[data-column="title"]',
        ) as HTMLElement;
        const handle = titleHeader.querySelector(
            '[class*="cursor-col-resize"]',
        ) as HTMLElement;

        fireEvent.doubleClick(handle);

        // No real canvas implementation in jsdom, so it falls back to the
        // default 80px measurement.
        expect(titleHeader).toHaveStyle({ width: '80px' });
    });

    test('opens the column settings dropdown and resets column sizes', async () => {
        const user = userEvent.setup();
        render(<IssueTable issues={[]} />);

        const settingsTrigger = document
            .querySelector('.lucide-settings')
            ?.closest('div') as HTMLElement;
        await user.click(settingsTrigger);

        await user.click(screen.getByText('Reset Column Sizes'));

        expect(mockAddAlert).toHaveBeenCalledWith(
            'Column sizes reset',
            'information',
        );
    });

    test('changes the row height from the settings dropdown', async () => {
        const user = userEvent.setup();
        const issues = [makeIssue({ title: 'Issue 1' })];
        const { container } = render(<IssueTable issues={issues} />);

        const settingsTrigger = document
            .querySelector('.lucide-settings')
            ?.closest('div') as HTMLElement;
        // The dropdown stays open after picking an option, so it only needs
        // to be opened once before selecting each row-height option in turn.
        await user.click(settingsTrigger);

        await user.click(screen.getByText('Row: Compact'));
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Row height: Compact',
            'information',
        );
        expect(container.querySelector('tbody tr')).toHaveStyle({
            height: '32px',
        });

        await user.click(screen.getByText('Row: Spacious'));
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Row height: Spacious',
            'information',
        );
        expect(container.querySelector('tbody tr')).toHaveStyle({
            height: '64px',
        });

        await user.click(screen.getByText('Row: Comfortable'));
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Row height: Comfortable',
            'information',
        );
        expect(container.querySelector('tbody tr')).toHaveStyle({
            height: '44px',
        });
    });

    test('toggles a column off from the settings dropdown without a project', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        render(<IssueTable issues={[]} />);

        expect(
            screen.getByRole('columnheader', { name: 'Assignee' }),
        ).toBeInTheDocument();

        const settingsTrigger = document
            .querySelector('.lucide-settings')
            ?.closest('div') as HTMLElement;
        await user.click(settingsTrigger);

        // "Assignee" appears both as a column header and a dropdown option;
        // the dropdown option is the one inside the portal-rendered menu.
        await user.click(screen.getAllByText('Assignee')[1]);

        expect(
            screen.queryByRole('columnheader', { name: 'Assignee' }),
        ).not.toBeInTheDocument();
        // No project was supplied, so no persistence request is made.
        expect(router.patch).not.toHaveBeenCalled();
    });

    test('toggles a column and persists it to the server when a project is provided', async () => {
        const user = userEvent.setup();
        const { router } = await import('@inertiajs/react');
        const project = makeProject();
        render(<IssueTable issues={[]} project={project} />);

        const settingsTrigger = document
            .querySelector('.lucide-settings')
            ?.closest('div') as HTMLElement;
        await user.click(settingsTrigger);

        await user.click(screen.getAllByText('Assignee')[1]);

        expect(router.patch).toHaveBeenCalledWith(
            '/projects/1/columns',
            {
                columns: expect.objectContaining({ assignee: false }),
            },
            expect.objectContaining({ preserveScroll: true }),
        );
        expect(mockAddAlert).toHaveBeenCalledWith(
            'Table columns updated',
            'information',
        );
    });

    test('initializes enabled columns from project.columns when provided', () => {
        const project = makeProject({
            columns: {
                id: true,
                title: true,
                status: false,
                assignee: false,
                priority: false,
                labels: false,
                updated: false,
                start_date: true,
                end_date: true,
            },
        });

        render(<IssueTable issues={[]} project={project} />);

        expect(
            screen.getByRole('columnheader', { name: 'Start' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('columnheader', { name: 'Status' }),
        ).not.toBeInTheDocument();
    });

    test('updates enabled columns when the project.columns prop changes', () => {
        const project = makeProject({
            columns: {
                id: true,
                title: true,
                status: true,
                assignee: true,
                priority: true,
                labels: true,
                updated: true,
                start_date: false,
                end_date: false,
            },
        });

        const { rerender } = render(
            <IssueTable issues={[]} project={project} />,
        );

        expect(
            screen.queryByRole('columnheader', { name: 'Start' }),
        ).not.toBeInTheDocument();

        rerender(
            <IssueTable
                issues={[]}
                project={{
                    ...project,
                    columns: { ...project.columns, start_date: true },
                }}
            />,
        );

        expect(
            screen.getByRole('columnheader', { name: 'Start' }),
        ).toBeInTheDocument();
    });
});
