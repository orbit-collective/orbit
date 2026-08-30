import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { PageHeaderProps } from '@/types/Components';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import MainLayout from './MainLayout';

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: Project[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

vi.mock('@/Components/Organisms/NewIssueModal/NewIssueModal', () => ({
    default: ({ isOpen }: { isOpen: boolean }) => (
        <div data-testid="new-issue-modal" data-open={isOpen} />
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
            <ShortcutProvider>{ui}</ShortcutProvider>
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

    test('switches the view with the "1"/"2"/"3" keyboard shortcuts', () => {
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

        fireEvent.keyDown(window, { key: '1' });
        expect(setSelectedLook).toHaveBeenCalledWith('List');
    });

    test('opens the new issue modal when the "New issue" primary action is clicked', () => {
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

        expect(screen.getByTestId('new-issue-modal')).toHaveAttribute(
            'data-open',
            'false',
        );

        fireEvent.click(screen.getByRole('button', { name: 'New issue' }));

        expect(screen.getByTestId('new-issue-modal')).toHaveAttribute(
            'data-open',
            'true',
        );
    });

    test('opens the new issue modal with the "c" and "ctrl+i" shortcuts', () => {
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
        expect(screen.getByTestId('new-issue-modal')).toHaveAttribute(
            'data-open',
            'true',
        );
    });
});
