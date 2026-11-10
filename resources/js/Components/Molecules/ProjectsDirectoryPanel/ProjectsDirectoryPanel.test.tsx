import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, test, vi } from 'vitest';
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
    afterEach(() => {
        vi.restoreAllMocks();
    });

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

    describe('variants and options', () => {
        const many = [
            {
                ...project(1),
                name: 'Charlie',
                issue_counts: { todo: 1, in_progress: 0, done: 1 },
            },
            {
                ...project(2),
                name: 'Alpha',
                issue_counts: { todo: 4, in_progress: 0, done: 0 },
            },
            {
                ...project(3),
                name: 'Bravo',
                issue_counts: { todo: 0, in_progress: 0, done: 3 },
            },
        ];
        const names = () =>
            screen
                .getAllByText(/^(Charlie|Alpha|Bravo)$/)
                .map((el) => el.textContent);

        test('the grid variant shows a tile with progress per project', () => {
            render(
                <ProjectsDirectoryPanel
                    projects={many}
                    variant="grid"
                    limit={5}
                />,
            );

            expect(screen.getAllByTestId('project-tile-progress')).toHaveLength(
                3,
            );
            expect(screen.getByText('100%')).toBeInTheDocument();
            expect(screen.getByText('0%')).toBeInTheDocument();
        });

        test('a project without issues has no progress in its tile', () => {
            render(
                <ProjectsDirectoryPanel
                    projects={[{ ...project(1), issue_counts: undefined }]}
                    variant="grid"
                />,
            );

            expect(screen.getByText('0 issues')).toBeInTheDocument();
        });

        test.each([
            ['latest', ['Charlie', 'Alpha', 'Bravo']],
            ['name', ['Alpha', 'Bravo', 'Charlie']],
            ['progress', ['Bravo', 'Charlie', 'Alpha']],
            ['issues', ['Alpha', 'Bravo', 'Charlie']],
        ] as const)('orders by %s', (sort, expected) => {
            render(
                <ProjectsDirectoryPanel
                    projects={many}
                    variant="compact"
                    sort={sort}
                    limit={5}
                />,
            );

            expect(names()).toEqual(expected);
        });

        test('only says "latest" while the order is the latest', () => {
            const { rerender } = render(
                <ProjectsDirectoryPanel projects={many} />,
            );
            expect(
                screen.getByText('Showing 3 latest projects'),
            ).toBeInTheDocument();

            rerender(<ProjectsDirectoryPanel projects={many} sort="name" />);
            expect(screen.getByText('Showing 3 projects')).toBeInTheDocument();
        });

        test('the title and the link to all projects can be hidden', () => {
            render(
                <ProjectsDirectoryPanel
                    projects={many}
                    limit={3}
                    showHeader={false}
                    showViewAll={false}
                />,
            );
            expect(
                screen.queryByText('Projects Directory'),
            ).not.toBeInTheDocument();

            expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
        });

        test('the link to all projects is hidden when asked even with more projects', () => {
            render(
                <ProjectsDirectoryPanel
                    projects={many}
                    limit={3}
                    showViewAll={false}
                />,
            );

            expect(screen.queryByText(/View all/)).not.toBeInTheDocument();
        });

        test.each([
            [300, 1],
            [400, 2],
            [700, 3],
        ])(
            'the grid fits as many tiles as the width allows (%ipx: %i)',
            (width, columns) => {
                vi.spyOn(
                    HTMLElement.prototype,
                    'clientWidth',
                    'get',
                ).mockReturnValue(width);

                render(
                    <ProjectsDirectoryPanel
                        projects={many}
                        variant="grid"
                        limit={5}
                    />,
                );

                const grid = screen
                    .getAllByTestId('project-tile-progress')[0]
                    .closest('.grid')!;
                expect((grid as HTMLElement).style.gridTemplateColumns).toBe(
                    `repeat(${columns}, minmax(0px, 1fr))`,
                );
            },
        );

        test('the other styles stay in one column', () => {
            vi.spyOn(
                HTMLElement.prototype,
                'clientWidth',
                'get',
            ).mockReturnValue(900);

            render(
                <ProjectsDirectoryPanel
                    projects={many}
                    variant="compact"
                    limit={5}
                />,
            );

            const grid = screen
                .getByText('Alpha')
                .closest('.grid') as HTMLElement;
            expect(grid.style.gridTemplateColumns).toBe(
                'repeat(1, minmax(0px, 1fr))',
            );
        });
    });
});
