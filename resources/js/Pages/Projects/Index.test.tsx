import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Project } from '@/types/Projects';
import Index from './Index';

const mockRunCommand = vi.hoisted(() => vi.fn());

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({
        runCommand: mockRunCommand,
    }),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
        className,
        onClick,
    }: {
        children: React.ReactNode;
        href?: string;
        className?: string;
        onClick?: () => void;
    }) => (
        <a href={href} className={className} onClick={onClick}>
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
        primaryAction,
        children,
    }: {
        title: string;
        primaryAction?: { label: string; onClick: () => void };
        children?: React.ReactNode;
    }) => (
        <div data-testid="page-header" data-title={title}>
            {primaryAction && (
                <button onClick={primaryAction.onClick}>
                    {primaryAction.label}
                </button>
            )}
            {children}
        </div>
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

describe('Projects Index Page', () => {
    test('renders the Sidebar with the provided projects and a Projects page header', () => {
        const projects = [makeProject({ id: 1 }), makeProject({ id: 2 })];
        render(<Index projects={projects} />);

        expect(screen.getByTestId('sidebar')).toHaveAttribute(
            'data-projects-count',
            '2',
        );
        expect(screen.getByTestId('page-header')).toHaveAttribute(
            'data-title',
            'Projects',
        );
    });

    test('runs the project.create command when the New project button is clicked', async () => {
        const user = userEvent.setup();
        render(<Index projects={[]} />);

        await user.click(screen.getByRole('button', { name: /New project/i }));

        expect(mockRunCommand).toHaveBeenCalledWith('project.create');
    });

    test('renders a ProjectCard for every project plus a "New Project" card', () => {
        const projects = [
            makeProject({ id: 1, name: 'Project One' }),
            makeProject({ id: 2, name: 'Project Two' }),
        ];
        render(<Index projects={projects} />);

        expect(screen.getByText('Project One')).toBeInTheDocument();
        expect(screen.getByText('Project Two')).toBeInTheDocument();
        expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    test("renders each project's own issue counts on its card", () => {
        const projects = [
            makeProject({
                id: 1,
                name: 'Project One',
                issue_counts: { todo: 1, in_progress: 0, done: 1 },
            }),
        ];
        render(<Index projects={projects} />);

        expect(screen.getByText('1/2 Issues')).toBeInTheDocument();
    });

    test('renders 0/0 issues for a project without counts', () => {
        render(<Index projects={[makeProject()]} />);

        expect(screen.getByText('0/0 Issues')).toBeInTheDocument();
    });

    test('renders an empty state and no project cards when there are no projects', () => {
        render(<Index projects={[]} />);

        expect(screen.getByText('Your dashboard is empty')).toBeInTheDocument();
        expect(screen.queryByText('New Project')).not.toBeInTheDocument();
    });

    test('the cards rise in one after another and stay stretched to their grid cell', async () => {
        render(
            <Index
                projects={[
                    makeProject({ id: 1, name: 'Project One' }),
                    makeProject({ id: 2, name: 'Project Two' }),
                ]}
            />,
        );

        await waitFor(() =>
            expect(screen.getByText('Project Two')).toBeVisible(),
        );
        const cell = screen
            .getByText('Project One')
            .closest('a')!.parentElement!;
        expect(cell.className).toContain('[&>*]:w-full');
        expect(cell.className).toContain('h-full');
        // The New Project card is a cell of the grid too.
        expect(
            screen.getByText('New Project').closest('a')!.parentElement!
                .className,
        ).toContain('h-full');
    });

    test('the empty state rises in as a page section', async () => {
        render(<Index projects={[]} />);

        await waitFor(() =>
            expect(screen.getByText('Your dashboard is empty')).toBeVisible(),
        );
    });

    test('the grid is a plain section: only the cards animate, so nothing rises twice', () => {
        const { container } = render(<Index projects={[makeProject()]} />);

        expect(
            container.querySelector('main > section.grid'),
        ).toBeInTheDocument();
    });
});
