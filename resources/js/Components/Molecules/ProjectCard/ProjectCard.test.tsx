import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Project } from '@/types/Projects';
import ProjectCard, { ProjectNewCard } from './ProjectCard';

const { runCommand } = vi.hoisted(() => ({
    runCommand: vi.fn(),
}));

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({
        runCommand,
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

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: 'An issue tracker',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
    ...overrides,
});

describe('ProjectCard Component', () => {
    test('renders the project name and description', () => {
        render(<ProjectCard project={makeProject()} />);

        expect(screen.getByText('Orbit')).toBeInTheDocument();
        expect(screen.getByText('An issue tracker')).toBeInTheDocument();
    });

    test('renders a fallback description when the project has none', () => {
        render(<ProjectCard project={makeProject({ description: '' })} />);

        expect(
            screen.getByText('No description provided.'),
        ).toBeInTheDocument();
    });

    test('shows 0% completion and 0/0 issues when there are no issues', () => {
        render(<ProjectCard project={makeProject()} />);

        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('0/0 Issues')).toBeInTheDocument();
    });

    test('computes the completion rate and per-category counts', () => {
        render(
            <ProjectCard
                project={makeProject({
                    issue_counts: { todo: 1, in_progress: 1, done: 2 },
                })}
            />,
        );

        // 2 of 4 done => 50%.
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('2/4 Issues')).toBeInTheDocument();
        expect(screen.getByText('To Do').closest('div')).toHaveTextContent('1');
        expect(
            screen.getByText('In Progress').closest('div'),
        ).toHaveTextContent('1');
        expect(screen.getByText('Done').closest('div')).toHaveTextContent('2');
    });

    test('is fully complete when every issue is done', () => {
        render(
            <ProjectCard
                project={makeProject({
                    issue_counts: { todo: 0, in_progress: 0, done: 3 },
                })}
            />,
        );

        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('3/3 Issues')).toBeInTheDocument();
    });

    test('links to the project detail page', () => {
        render(<ProjectCard project={makeProject({ id: 7 })} />);

        expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/7');
    });

    test('renders the project slug', () => {
        render(<ProjectCard project={makeProject({ slug: 'orbit-slug' })} />);

        expect(screen.getByText('orbit-slug')).toBeInTheDocument();
    });
});

describe('ProjectNewCard Component', () => {
    test('renders a "New Project" call-to-action', () => {
        render(<ProjectNewCard />);

        expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    test('runs the project.create command when clicked', async () => {
        render(<ProjectNewCard />);

        await userEvent.click(screen.getByText('New Project').closest('a')!);

        expect(runCommand).toHaveBeenCalledWith('project.create');
    });
});
