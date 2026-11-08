import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Project } from '@/types/Projects';
import ProjectsDirectoryPanel from './ProjectsDirectoryPanel';

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({ runCommand: vi.fn() }),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href?: string;
    }) => <a href={href}>{children}</a>,
}));

const project = (id: number): Project => ({
    id,
    name: `Project ${id}`,
    slug: `p${id}`,
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
    issue_counts: { todo: 1, in_progress: 1, done: 1 },
});

describe('ProjectsDirectoryPanel', () => {
    test('shows the latest projects up to the limit and links to all of them', () => {
        render(
            <ProjectsDirectoryPanel
                projects={[1, 2, 3, 4].map(project)}
                limit={3}
            />,
        );

        expect(screen.getByText('Project 3')).toBeInTheDocument();
        expect(screen.queryByText('Project 4')).not.toBeInTheDocument();
        expect(screen.getByText('View all 4 projects')).toHaveAttribute(
            'href',
            '/projects',
        );
    });

    test('has no link to all projects when everything is shown', () => {
        render(<ProjectsDirectoryPanel projects={[project(1)]} />);

        expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
    });

    test('the compact variant is one line per project', () => {
        render(
            <ProjectsDirectoryPanel
                projects={[project(1)]}
                variant="compact"
            />,
        );

        expect(screen.getByText('Project 1').closest('a')).toHaveAttribute(
            'href',
            '/projects/1',
        );
        expect(screen.getByText('3 issues')).toBeInTheDocument();
    });

    test('a project without counts shows 0 issues in the compact variant', () => {
        render(
            <ProjectsDirectoryPanel
                projects={[{ ...project(1), issue_counts: undefined }]}
                variant="compact"
            />,
        );

        expect(screen.getByText('0 issues')).toBeInTheDocument();
    });

    test('invites to create the first project when there are none', () => {
        render(<ProjectsDirectoryPanel projects={[]} />);

        expect(
            screen.getByText('Create your first project'),
        ).toBeInTheDocument();
    });
});
