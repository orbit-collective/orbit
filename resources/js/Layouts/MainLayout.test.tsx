import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { CommandProvider, useCommandPalette } from '@/context/CommandContext';
import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { PageHeaderProps } from '@/types/Components';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { QUICK_ADD_ISSUE_EVENT } from '@/utils/quickAddIssueEvent';
import MainLayout from './MainLayout';

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: Project[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

vi.mock('@/Components/Organisms/PageHeader/PageHeader', () => ({
    default: ({ title, primaryAction, tabs, children }: PageHeaderProps) => (
        <div data-testid="page-header" data-title={title}>
            {primaryAction && (
                <button onClick={primaryAction.onClick}>
                    {primaryAction.label}
                </button>
            )}
            {tabs?.map((tab) => (
                <button
                    key={tab.id}
                    data-testid={`tab-${tab.id}`}
                    data-active={tab.isActive}
                    onClick={tab.onClick}
                >
                    {tab.label}
                </button>
            ))}
            {children}
        </div>
    ),
}));

const renderWithShortcuts = (ui: React.ReactElement) =>
    render(
        <ModalProvider>
            <ShortcutProvider>
                <CommandProvider>{ui}</CommandProvider>
            </ShortcutProvider>
        </ModalProvider>,
    );

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

const makeUser = (overrides: Partial<AssignableUser> = {}): AssignableUser => ({
    id: 1,
    name: 'Jane Doe',
    ...overrides,
});

describe('MainLayout Component', () => {
    test('renders the children inside the main content area', () => {
        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={vi.fn()}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        expect(screen.getByText('Page content')).toBeInTheDocument();
    });

    test('renders the Sidebar and PageHeader with the project name as title', () => {
        renderWithShortcuts(
            <MainLayout
                selectedLook="Board"
                setSelectedLook={vi.fn()}
                projects={[makeProject()]}
                project={makeProject({ name: 'Roadmap' })}
                users={[makeUser()]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
        expect(screen.getByTestId('page-header')).toHaveAttribute(
            'data-title',
            'Roadmap',
        );
    });

    test('forwards the projects list to Sidebar', () => {
        const projects = [
            makeProject({ id: 1 }),
            makeProject({ id: 2 }),
            makeProject({ id: 3 }),
        ];

        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={vi.fn()}
                projects={projects}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        expect(screen.getByTestId('sidebar')).toHaveAttribute(
            'data-projects-count',
            '3',
        );
    });

    test('marks the active view tab based on selectedLook', () => {
        renderWithShortcuts(
            <MainLayout
                selectedLook="Calendar"
                setSelectedLook={vi.fn()}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        expect(screen.getByTestId('tab-Calendar')).toHaveAttribute(
            'data-active',
            'true',
        );
        expect(screen.getByTestId('tab-List')).toHaveAttribute(
            'data-active',
            'false',
        );
    });

    test('switches the view when a tab is clicked', () => {
        const setSelectedLook = vi.fn();
        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={setSelectedLook}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        fireEvent.click(screen.getByTestId('tab-Board'));

        expect(setSelectedLook).toHaveBeenCalledWith('Board');
    });

    test('switches the view with the "1"/"2"/"3"/"4" keyboard shortcuts', () => {
        const setSelectedLook = vi.fn();
        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={setSelectedLook}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        fireEvent.keyDown(window, { key: '2' });
        expect(setSelectedLook).toHaveBeenCalledWith('Board');

        fireEvent.keyDown(window, { key: '3' });
        expect(setSelectedLook).toHaveBeenCalledWith('Calendar');

        fireEvent.keyDown(window, { key: '4' });
        expect(setSelectedLook).toHaveBeenCalledWith('Activity');

        fireEvent.keyDown(window, { key: '1' });
        expect(setSelectedLook).toHaveBeenCalledWith('List');
    });

    test('switches the view when the List, Calendar or Activity tab is clicked', () => {
        const setSelectedLook = vi.fn();
        renderWithShortcuts(
            <MainLayout
                selectedLook="Board"
                setSelectedLook={setSelectedLook}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        fireEvent.click(screen.getByTestId('tab-List'));
        expect(setSelectedLook).toHaveBeenCalledWith('List');

        fireEvent.click(screen.getByTestId('tab-Calendar'));
        expect(setSelectedLook).toHaveBeenCalledWith('Calendar');

        fireEvent.click(screen.getByTestId('tab-Activity'));
        expect(setSelectedLook).toHaveBeenCalledWith('Activity');
    });

    test('dispatches the quick-add issue event when the "New issue" primary action is clicked', () => {
        const handler = vi.fn();
        window.addEventListener(QUICK_ADD_ISSUE_EVENT, handler);

        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={vi.fn()}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'New issue' }));

        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener(QUICK_ADD_ISSUE_EVENT, handler);
    });

    test('dispatches the quick-add issue event with the "c" and "ctrl+i" shortcuts', () => {
        const handler = vi.fn();
        window.addEventListener(QUICK_ADD_ISSUE_EVENT, handler);

        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={vi.fn()}
                projects={[]}
                project={makeProject()}
                users={[]}
            >
                <div>Page content</div>
            </MainLayout>,
        );

        fireEvent.keyDown(window, { key: 'c' });
        expect(handler).toHaveBeenCalledTimes(1);
        window.removeEventListener(QUICK_ADD_ISSUE_EVENT, handler);
    });

    test('the header search button opens the command palette', () => {
        let isOpen = false;
        const Probe = () => {
            isOpen = useCommandPalette().isOpen;
            return null;
        };
        renderWithShortcuts(
            <>
                <Probe />
                <MainLayout
                    selectedLook="List"
                    setSelectedLook={vi.fn()}
                    projects={[makeProject()]}
                    project={makeProject()}
                    users={[makeUser()]}
                >
                    <div />
                </MainLayout>
            </>,
        );
        expect(isOpen).toBe(false);

        fireEvent.click(
            screen.getByRole('button', { name: 'Open command palette' }),
        );

        expect(isOpen).toBe(true);
    });

    test('the header search button is just an icon, with no shortcut chips', () => {
        renderWithShortcuts(
            <MainLayout
                selectedLook="List"
                setSelectedLook={vi.fn()}
                projects={[makeProject()]}
                project={makeProject()}
                users={[makeUser()]}
            >
                <div />
            </MainLayout>,
        );

        const button = screen.getByRole('button', {
            name: 'Open command palette',
        });
        expect(button.querySelector('svg')).not.toBeNull();
        expect(button.querySelector('kbd')).toBeNull();
        expect(button).toHaveTextContent('');
    });

    test('registers project-scoped commands for create issue and each view', () => {
        const Probe = () => {
            const { commands } = useCommandPalette();
            return (
                <ul>
                    {commands.map((c) => (
                        <li key={c.id} data-scope={c.scope}>
                            {c.id}
                        </li>
                    ))}
                </ul>
            );
        };
        renderWithShortcuts(
            <>
                <Probe />
                <MainLayout
                    selectedLook="List"
                    setSelectedLook={vi.fn()}
                    projects={[makeProject()]}
                    project={makeProject()}
                    users={[makeUser()]}
                >
                    <div />
                </MainLayout>
            </>,
        );

        [
            'issue.create',
            'view.list',
            'view.board',
            'view.calendar',
            'view.activity',
            'issue.search',
        ].forEach((id) => {
            expect(screen.getByText(id)).toHaveAttribute(
                'data-scope',
                'project',
            );
        });
    });

    test('the "Search issues" command focuses the filter input', () => {
        const Probe = () => {
            const { runCommand } = useCommandPalette();
            return (
                <button onClick={() => runCommand('issue.search')}>go</button>
            );
        };
        renderWithShortcuts(
            <>
                <input id="global-search-input" />
                <Probe />
                <MainLayout
                    selectedLook="List"
                    setSelectedLook={vi.fn()}
                    projects={[makeProject()]}
                    project={makeProject()}
                    users={[makeUser()]}
                >
                    <div />
                </MainLayout>
            </>,
        );

        fireEvent.click(screen.getByText('go'));

        expect(document.getElementById('global-search-input')).toHaveFocus();
    });
});
