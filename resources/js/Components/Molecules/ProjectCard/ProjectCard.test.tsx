import { Issue } from '@/types/Issues';
import { Project } from '@/types/Projects';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import ProjectCard, { ProjectNewCard } from './ProjectCard';

const { triggerShortcut } = vi.hoisted(() => ({
    triggerShortcut: vi.fn(),
}));

vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: () => ({
        triggerShortcut,
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

let issueId = 0;
const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: `ISSUE-${issueId++}`,
    title: 'An issue',
    status: 'open',
    priority: 'medium',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

describe('ProjectCard Component', () => {
    test('renders the project name and description', () => {
        render(<ProjectCard project={makeProject()} issues={[]} />);

        expect(screen.getByText('Orbit')).toBeInTheDocument();
        expect(screen.getByText('An issue tracker')).toBeInTheDocument();
    });

    test('renders a fallback description when the project has none', () => {
        render(
            <ProjectCard
                project={makeProject({ description: '' })}
                issues={[]}
            />,
        );

        expect(
            screen.getByText('No description provided.'),
        ).toBeInTheDocument();
    });

    test('shows 0% completion and 0/0 issues when there are no issues', () => {
        render(<ProjectCard project={makeProject()} issues={[]} />);

        expect(screen.getByText('0%')).toBeInTheDocument();
        expect(screen.getByText('0/0 Issues')).toBeInTheDocument();
    });

    test('computes the completion rate and open/closed counts', () => {
        const issues = [
            makeIssue({ status: 'closed' }),
            makeIssue({ status: 'closed' }),
            makeIssue({ status: 'open' }),
            makeIssue({ status: 'open' }),
        ];
        render(<ProjectCard project={makeProject()} issues={issues} />);

        // 2 of 4 closed => 50%.
        expect(screen.getByText('50%')).toBeInTheDocument();
        expect(screen.getByText('2/4 Issues')).toBeInTheDocument();

        const openRow = screen.getByText('Open').closest('div');
        expect(openRow).toHaveTextContent('2');

        const closedRow = screen.getByText('Closed').closest('div');
        expect(closedRow).toHaveTextContent('2');
    });

    test('only counts issues that belong to this project', () => {
        const issues = [
            makeIssue({ project_id: 1, status: 'closed' }),
            makeIssue({ project_id: 2, status: 'open' }),
            makeIssue({ project_id: 99, status: 'open' }),
        ];
        render(
            <ProjectCard project={makeProject({ id: 1 })} issues={issues} />,
        );

        // Only the single project-1 issue is counted (closed => 100%).
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('1/1 Issues')).toBeInTheDocument();
    });

    test('links to the project detail page', () => {
        render(<ProjectCard project={makeProject({ id: 7 })} issues={[]} />);

        expect(screen.getByRole('link')).toHaveAttribute('href', '/projects/7');
    });

    test('renders the project slug', () => {
        render(
            <ProjectCard
                project={makeProject({ slug: 'orbit-slug' })}
                issues={[]}
            />,
        );

        expect(screen.getByText('orbit-slug')).toBeInTheDocument();
    });
});

describe('ProjectNewCard Component', () => {
    test('renders a "New Project" call-to-action', () => {
        render(<ProjectNewCard />);

        expect(screen.getByText('New Project')).toBeInTheDocument();
    });

    test('triggers the "p" shortcut when clicked', async () => {
        render(<ProjectNewCard />);

        await userEvent.click(screen.getByText('New Project').closest('a')!);

        expect(triggerShortcut).toHaveBeenCalledWith('p');
    });
});
