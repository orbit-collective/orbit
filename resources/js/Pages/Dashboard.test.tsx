import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { makeDashboardLayout, makeWidget } from '@/tests/dashboardLayout';
import { makeIssueStats } from '@/tests/issueStats';
import { makePaginated } from '@/tests/paginated';
import { Command } from '@/types/Commands';
import { DashboardLayoutProp } from '@/types/Dashboard';
import { Project } from '@/types/Projects';
import Dashboard from './Dashboard';

const mocks = vi.hoisted(() => ({
    useDashboardLive: vi.fn(),
    runCommand: vi.fn(),
    router: { put: vi.fn(), delete: vi.fn(), reload: vi.fn() },
    commands: new Map<string, { perform?: () => void }>(),
}));

vi.mock('@/live/useDashboardLive', () => ({
    useDashboardLive: mocks.useDashboardLive,
}));

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({
        runCommand: mocks.runCommand,
        register: (commands: Command[]) => {
            commands.forEach((command) =>
                mocks.commands.set(command.id, command),
            );
            return () => commands.forEach((c) => mocks.commands.delete(c.id));
        },
    }),
}));

vi.mock('@inertiajs/react', () => ({
    router: mocks.router,
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
}));

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: Project[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

vi.mock('@/Components/Organisms/PageHeader/PageHeader', () => ({
    default: ({
        title,
        children,
    }: {
        title: string;
        children?: React.ReactNode;
    }) => (
        <div data-testid="page-header" data-title={title}>
            {children}
        </div>
    ),
}));

vi.mock('@/Components/Molecules/Pagination/Pagination', () => ({
    default: () => <div data-testid="pagination" />,
}));

vi.mock('@/Components/Organisms/ActivityLogs/ActivityLogs', () => ({
    default: ({ logs }: { logs: unknown[] }) => (
        <div data-testid="activity-logs" data-logs-count={logs.length} />
    ),
}));

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

const baseProps = () => ({
    dashboardLayout: makeDashboardLayout(),
    issueStats: makeIssueStats({ high: 2, todo: 2, done: 2 }),
    projects: [makeProject()],
    productivity_trend: [],
    activityLogs: makePaginated([]),
    users: [],
    issueTypes: [],
});

const renderDashboard = (
    overrides: Partial<React.ComponentProps<typeof Dashboard>> = {},
) => render(<Dashboard {...baseProps()} {...overrides} />);

/** Opens the editor the way the palette does. */
const startEditing = () =>
    act(() => {
        mocks.commands.get('dashboard.edit')!.perform!();
    });

const layoutOf = (...types: Parameters<typeof makeWidget>[0][]) =>
    makeDashboardLayout(types.map((type) => makeWidget(type)));

beforeEach(() => {
    vi.clearAllMocks();
    mocks.commands.clear();
});

describe('Dashboard Page', () => {
    test('follows live changes in every project of the user', () => {
        renderDashboard({
            projects: [makeProject({ id: 4 }), makeProject({ id: 9 })],
        });

        expect(mocks.useDashboardLive).toHaveBeenCalledWith(
            [4, 9],
            expect.arrayContaining(['projects', 'issueStats', 'activityLogs']),
        );
    });

    test('only the data props that arrived are followed live', () => {
        renderDashboard({
            dashboardLayout: layoutOf('stat_projects'),
            productivity_trend: undefined,
            activityLogs: undefined,
            users: undefined,
            issueTypes: undefined,
        });

        expect(mocks.useDashboardLive).toHaveBeenCalledWith(
            [1],
            ['projects', 'issueStats'],
        );
    });

    test('renders the Sidebar with the provided projects and a Dashboard page header', () => {
        renderDashboard({
            projects: [makeProject({ id: 1 }), makeProject({ id: 2 })],
        });

        expect(screen.getByTestId('sidebar')).toHaveAttribute(
            'data-projects-count',
            '2',
        );
        expect(screen.getByTestId('page-header')).toHaveAttribute(
            'data-title',
            'Dashboard',
        );
    });

    test('draws the widgets of the layout with their numbers', () => {
        renderDashboard();

        expect(screen.getByText('Active Projects')).toBeInTheDocument();
        expect(screen.getByText('Open Issues')).toBeInTheDocument();
        expect(screen.getByText('Critical Tasks')).toBeInTheDocument();
        expect(screen.getByText('Resolution Rate')).toBeInTheDocument();
        // 2 of 4 issues are done.
        expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
        expect(screen.getByTestId('activity-logs')).toBeInTheDocument();
        expect(screen.getByText('Projects Directory')).toBeInTheDocument();
    });

    test('shows 0% resolution rate when there are no issues', () => {
        renderDashboard({ issueStats: makeIssueStats(), projects: [] });

        expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    });

    test('draws only the visible widgets, in the order of the layout', () => {
        renderDashboard({
            dashboardLayout: makeDashboardLayout([
                makeWidget('stat_critical'),
                makeWidget('stat_projects'),
                makeWidget('stat_open_issues', { visible: false }),
            ]),
        });

        const titles = ['Critical Tasks', 'Active Projects'].map((title) =>
            screen.getByText(title),
        );

        expect(
            titles[0].compareDocumentPosition(titles[1]) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
        expect(screen.queryByText('Open Issues')).not.toBeInTheDocument();
    });

    test('keeps the "Open dashboard editor" button, which runs the edit command', async () => {
        renderDashboard();

        await userEvent.click(
            screen.getByRole('button', { name: 'Open dashboard editor' }),
        );

        expect(mocks.runCommand).toHaveBeenCalledWith('dashboard.edit');
    });

    test('registers the edit command in the palette', () => {
        renderDashboard();

        expect(mocks.commands.has('dashboard.edit')).toBe(true);
    });
});

describe('Dashboard editing', () => {
    test('shows the editor bar and panel only while editing', () => {
        renderDashboard();

        expect(screen.queryByText('Editing dashboard')).not.toBeInTheDocument();

        startEditing();

        expect(screen.getByText('Editing dashboard')).toBeInTheDocument();
        expect(
            screen.getByRole('complementary', { name: 'Dashboard widgets' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    test('cancel leaves the editor and drops the draft', async () => {
        renderDashboard();
        startEditing();

        await userEvent.click(
            screen.getByRole('button', { name: 'Hide Open Issues' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByText('Editing dashboard')).not.toBeInTheDocument();
        expect(screen.getByText('Open Issues')).toBeInTheDocument();
        expect(mocks.router.put).not.toHaveBeenCalled();
    });

    test('hiding a widget and saving sends the whole layout', async () => {
        renderDashboard({
            dashboardLayout: layoutOf('stat_projects', 'stat_critical'),
        });
        startEditing();

        await userEvent.click(
            screen.getByRole('button', { name: 'Hide Critical Tasks' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(mocks.router.put).toHaveBeenCalledWith(
            '/dashboard/layout',
            {
                widgets: [
                    makeWidget('stat_projects'),
                    makeWidget('stat_critical', { visible: false }),
                ],
            },
            expect.objectContaining({ preserveScroll: true }),
        );
    });

    test('leaves the editor once the layout was saved', async () => {
        mocks.router.put.mockImplementation((_url, _data, options) =>
            options.onSuccess(),
        );
        renderDashboard({ dashboardLayout: layoutOf('stat_projects') });
        startEditing();

        await userEvent.click(
            screen.getByRole('button', { name: 'Hide Active Projects' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(screen.queryByText('Editing dashboard')).not.toBeInTheDocument();
    });

    test('moving a widget down reorders the draft', async () => {
        renderDashboard({
            dashboardLayout: layoutOf('stat_projects', 'stat_critical'),
        });
        startEditing();

        await userEvent.click(screen.getAllByTestId('widget-drag-header')[0]);
        await userEvent.click(screen.getByRole('button', { name: 'Later' }));
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        const sent = mocks.router.put.mock.calls[0][1].widgets;
        expect(sent.map((widget: { id: string }) => widget.id)).toEqual([
            'stat_critical',
            'stat_projects',
        ]);
    });

    test('the settings of a picked widget change its style, width and options', async () => {
        renderDashboard({ dashboardLayout: layoutOf('projects') });
        startEditing();

        await userEvent.click(screen.getByTestId('widget-drag-header'));

        const panel = screen.getByRole('complementary');
        await userEvent.click(
            within(panel).getByRole('button', { name: 'Compact' }),
        );
        await userEvent.click(
            within(panel).getByRole('button', { name: 'Full' }),
        );
        await userEvent.click(
            within(panel).getByRole('button', { name: '10' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(mocks.router.put.mock.calls[0][1].widgets[0]).toMatchObject({
            variant: 'compact',
            width: 120,
            config: { limit: 10 },
        });
    });

    test('dragging the edge of a widget resizes it and saving sends the size', async () => {
        renderDashboard({ dashboardLayout: layoutOf('trend') });
        startEditing();

        // jsdom has no layout, so a column and a row are one pixel here.
        const handle = screen.getByTestId('resize-size');
        fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
        fireEvent.pointerMove(handle, {
            clientX: -21,
            clientY: 21,
            pointerId: 1,
        });
        fireEvent.pointerUp(handle, { pointerId: 1 });

        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        // 80 - 21 = 59 snaps to 60 columns; 85 + 5 (21px) = 90 rows.
        expect(mocks.router.put.mock.calls[0][1].widgets[0]).toMatchObject({
            width: 60,
            height: 90,
        });
    });

    test('with snap off a resize moves by single columns', async () => {
        renderDashboard({ dashboardLayout: layoutOf('trend') });
        startEditing();

        await userEvent.click(
            screen.getByRole('switch', { name: 'Snap to grid' }),
        );

        const handle = screen.getByTestId('resize-width');
        fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
        fireEvent.pointerMove(handle, {
            clientX: -7,
            clientY: 0,
            pointerId: 1,
        });
        fireEvent.pointerUp(handle, { pointerId: 1 });

        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(mocks.router.put.mock.calls[0][1].widgets[0]).toMatchObject({
            width: 73,
            height: 85,
        });
    });

    test('a widget can be removed from its settings', async () => {
        renderDashboard({
            dashboardLayout: layoutOf('stat_projects', 'stat_critical'),
        });
        startEditing();

        await userEvent.click(screen.getAllByTestId('widget-drag-header')[0]);
        await userEvent.click(
            screen.getByRole('button', { name: 'Remove widget' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(
            mocks.router.put.mock.calls[0][1].widgets.map(
                (w: { id: string }) => w.id,
            ),
        ).toEqual(['stat_critical']);
    });

    test('adding a widget whose data did not arrive asks the server for it', async () => {
        renderDashboard({
            dashboardLayout: layoutOf('stat_projects'),
            issueStats: undefined,
            productivity_trend: undefined,
            activityLogs: undefined,
            users: undefined,
            issueTypes: undefined,
        });
        startEditing();
        expect(mocks.router.reload).not.toHaveBeenCalled();

        await userEvent.click(
            screen.getByRole('button', { name: 'Add Productivity Trend' }),
        );

        await waitFor(() =>
            expect(mocks.router.reload).toHaveBeenCalledWith({
                only: ['productivity_trend'],
            }),
        );
        expect(screen.getByTestId('widget-placeholder')).toBeInTheDocument();
    });

    test('reset asks the server for the default layout', async () => {
        renderDashboard();
        startEditing();

        await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
        await userEvent.click(
            screen.getByRole('button', { name: 'Yes, reset' }),
        );

        expect(mocks.router.delete).toHaveBeenCalledWith(
            '/dashboard/layout',
            expect.objectContaining({ preserveScroll: true }),
        );
    });
});

test('a layout prop of another shape still renders the page', () => {
    const empty: DashboardLayoutProp = { widgets: [], catalog: [] };

    renderDashboard({ dashboardLayout: empty });

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
});
