import { Issue } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { Project } from '@/types/Projects';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import IssueChildrenPanel from './IssueChildrenPanel';

vi.stubGlobal(
    'route',
    vi.fn((name: string, params?: unknown) => `/${name}/${params ?? ''}`),
);

vi.mock('@inertiajs/react', () => ({
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
    router: { post: vi.fn() },
}));

const project: Project = {
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
};

const makeType = (overrides: Partial<IssueType> = {}): IssueType => ({
    id: 1,
    name: 'Task',
    icon: 'SquareCheck',
    color: '#3b82f6',
    description: null,
    isSystem: true,
    allowsChildren: false,
    isTopLevel: true,
    requiredFields: [],
    restrictedRoleTypes: [],
    ...overrides,
});

const taskType = makeType();
const bugType = makeType({ id: 2, name: 'Bug', icon: 'Bug', color: '#ef4444' });
const epicType = makeType({
    id: 3,
    name: 'Epic',
    icon: 'Zap',
    color: '#a855f7',
    allowsChildren: true,
});

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '10',
    title: 'Big epic',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    issueType: epicType,
    ...overrides,
});

const issueTypes = [taskType, bugType, epicType];

describe('IssueChildrenPanel', () => {
    beforeEach(() => vi.clearAllMocks());

    test('shows an empty state when the issue has no sub-issues', () => {
        render(
            <IssueChildrenPanel
                project={project}
                issue={makeIssue()}
                issueTypes={issueTypes}
            />,
        );

        expect(screen.getByText(/No sub-issues yet/)).toBeInTheDocument();
    });

    test('lists each child issue with its id and title', () => {
        render(
            <IssueChildrenPanel
                project={project}
                issue={makeIssue({
                    children: [
                        makeIssue({
                            id: '11',
                            title: 'Child one',
                            issueType: taskType,
                        }),
                        makeIssue({
                            id: '12',
                            title: 'Child two',
                            issueType: bugType,
                        }),
                    ],
                })}
                issueTypes={issueTypes}
            />,
        );

        expect(screen.getByText('Child one')).toBeInTheDocument();
        expect(screen.getByText('Child two')).toBeInTheDocument();
        expect(screen.getByText('#11')).toBeInTheDocument();
        expect(screen.getByText('Sub-issues')).toBeInTheDocument();
    });

    test('adding a sub-issue posts it with the parent id and selected type', async () => {
        const { router } = await import('@inertiajs/react');
        render(
            <IssueChildrenPanel
                project={project}
                issue={makeIssue()}
                issueTypes={issueTypes}
            />,
        );

        fireEvent.click(screen.getByText('Add sub-issue'));
        const input = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(input, { target: { value: 'A new child' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(router.post).toHaveBeenCalledWith(
            expect.stringContaining('issues.store'),
            expect.objectContaining({
                title: 'A new child',
                project_id: 1,
                parent_id: '10',
                issue_type_id: 1,
            }),
            expect.any(Object),
        );
    });

    test('an empty title does not create a sub-issue', async () => {
        const { router } = await import('@inertiajs/react');
        render(
            <IssueChildrenPanel
                project={project}
                issue={makeIssue()}
                issueTypes={issueTypes}
            />,
        );

        fireEvent.click(screen.getByText('Add sub-issue'));
        fireEvent.keyDown(
            screen.getByPlaceholderText('What needs to be done?'),
            { key: 'Enter' },
        );

        expect(router.post).not.toHaveBeenCalled();
    });

    test('only offers the types the parent allows as children', () => {
        render(
            <IssueChildrenPanel
                project={project}
                issue={makeIssue({
                    issueType: { ...epicType, allowedChildTypeIds: [2] },
                })}
                issueTypes={issueTypes}
            />,
        );

        fireEvent.click(screen.getByText('Add sub-issue'));

        expect(screen.getByText('Bug')).toBeInTheDocument();
        expect(screen.queryByText('Task')).not.toBeInTheDocument();
    });

    test('pressing Escape closes the inline add row', () => {
        render(
            <IssueChildrenPanel
                project={project}
                issue={makeIssue()}
                issueTypes={issueTypes}
            />,
        );

        fireEvent.click(screen.getByText('Add sub-issue'));
        fireEvent.keyDown(
            screen.getByPlaceholderText('What needs to be done?'),
            { key: 'Escape' },
        );

        expect(
            screen.queryByPlaceholderText('What needs to be done?'),
        ).not.toBeInTheDocument();
    });
});
