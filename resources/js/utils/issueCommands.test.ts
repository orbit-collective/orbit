import { describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';
import { Issue, IssueAbilities } from '@/types/Issues';
import { WorkflowStatus } from '@/types/Workflow';
import { buildIssueCommands, IssueCommandContext } from './issueCommands';

const ALL: IssueAbilities = {
    update: true,
    changeStatus: true,
    assign: true,
    changePriority: true,
    changeLabels: true,
};

const st = (id: number, name: string): WorkflowStatus => ({
    id,
    issueTypeId: 1,
    name,
    color: `#00${id}`,
    category: 'todo' as WorkflowStatus['category'],
    isInitial: id === 1,
});

const baseIssue = (overrides: Partial<Issue> = {}): Issue =>
    ({
        id: '42',
        number: 12,
        title: 'Fix login',
        status: 'open',
        priority: 'high',
        project_id: 1,
        user_id: 1,
        labels: ['bug'],
        issueType: {
            statuses: [st(1, 'Todo'), st(2, 'Doing'), st(3, 'Done')],
            transitions: [
                { id: 1, issueTypeId: 1, fromStatusId: 1, toStatusId: 2 },
                { id: 2, issueTypeId: 1, fromStatusId: 2, toStatusId: 3 },
            ],
        },
        workflowStatus: st(1, 'Todo'),
        ...overrides,
    }) as unknown as Issue;

const make = (overrides: Partial<IssueCommandContext> = {}) => {
    const ctx: IssueCommandContext = {
        issue: baseIssue(),
        ancestors: [],
        users: [
            { id: 1, name: 'Me' },
            { id: 2, name: 'Ann' },
            { id: 3, name: 'Bob' },
        ],
        labels: [
            {
                id: 10,
                name: 'bug',
                color: '#f00',
                description: null,
                isSystem: true,
            },
            {
                id: 11,
                name: 'ux',
                color: '#0f0',
                description: null,
                isSystem: true,
            },
        ],
        abilities: ALL,
        currentUserId: 1,
        link: 'https://orbit.test/projects/1/issues/42',
        issueUrl: (id) => `/projects/1/issues/${id}`,
        update: vi.fn(),
        copy: vi.fn(),
        visit: vi.fn(),
        ...overrides,
    };
    const commands = buildIssueCommands(ctx);
    const byId = (id: string) => commands.find((c) => c.id === id) as Command;
    const visible = () =>
        commands.filter((c) => !c.when || c.when()).map((c) => c.id);
    return { ctx, commands, byId, visible };
};

describe('buildIssueCommands', () => {
    test('every command leads the Suggested group, scoped to the issue', () => {
        const { commands } = make();

        commands.forEach((c) => {
            expect(c.group).toBe('suggested');
            expect(c.scope).toBe('issue');
            expect(c.context).toBe('#12');
        });
    });

    test('falls back to the global id when the issue has no number', () => {
        const { byId } = make({ issue: baseIssue({ number: undefined }) });

        expect(byId('issue.status').context).toBe('#42');
    });

    describe('permissions', () => {
        test('with every ability the mutating commands are all visible', () => {
            expect(make().visible()).toEqual(
                expect.arrayContaining([
                    'issue.status',
                    'issue.priority',
                    'issue.assign',
                    'issue.labels',
                    'issue.copy-link',
                    'issue.copy-id',
                ]),
            );
        });

        test('without update nothing mutating is offered, copy still is', () => {
            const { visible } = make({
                abilities: { ...ALL, update: false },
            });

            expect(visible()).toEqual(['issue.copy-link', 'issue.copy-id']);
        });

        test.each([
            ['changeStatus', 'issue.status'],
            ['assign', 'issue.assign'],
            ['changePriority', 'issue.priority'],
            ['changeLabels', 'issue.labels'],
        ] as const)('%s gates only %s', (ability, id) => {
            const { visible } = make({
                abilities: { ...ALL, [ability]: false },
            });

            expect(visible()).not.toContain(id);
            expect(visible()).toHaveLength(make().visible().length - 1);
        });

        test('labels are hidden when the project has none', () => {
            expect(make({ labels: [] }).visible()).not.toContain(
                'issue.labels',
            );
        });
    });

    describe('Change status', () => {
        test('lists only statuses the workflow allows from the current one', () => {
            const { byId } = make();

            expect(
                byId('issue.status')
                    .children?.()
                    .map((c) => c.title),
            ).toEqual(['Doing']);
        });

        test('follows the transitions of whichever status the issue is in', () => {
            const { byId } = make({
                issue: baseIssue({ workflowStatus: st(2, 'Doing') }),
            });

            expect(
                byId('issue.status')
                    .children?.()
                    .map((c) => c.title),
            ).toEqual(['Done']);
        });

        test('picking a status sends workflow_status_id through update', () => {
            const { ctx, byId } = make();

            byId('issue.status').children?.()[0].perform?.();

            expect(ctx.update).toHaveBeenCalledWith({ workflow_status_id: 2 });
        });

        test('is hidden when no transition leads anywhere', () => {
            const { visible } = make({
                issue: baseIssue({ workflowStatus: st(3, 'Done') }),
            });

            expect(visible()).not.toContain('issue.status');
        });

        test('shows the current status as the subtitle', () => {
            expect(make().byId('issue.status').subtitle).toBe('Todo');
        });

        test('a legacy issue without a workflow uses the legacy statuses', () => {
            const { ctx, byId } = make({
                issue: baseIssue({
                    issueType: undefined,
                    workflowStatus: undefined,
                }),
            });

            const steps = byId('issue.status').children?.() ?? [];
            expect(steps.map((c) => c.title)).toEqual([
                'In progress',
                'Closed',
            ]);

            steps[0].perform?.();
            expect(ctx.update).toHaveBeenCalledWith({ status: 'in_progress' });
        });
    });

    describe('Change priority', () => {
        test('offers the other two priorities', () => {
            const { byId } = make();

            expect(
                byId('issue.priority')
                    .children?.()
                    .map((c) => c.title),
            ).toEqual(['Medium', 'Low']);
        });

        test('picking one sends priority', () => {
            const { ctx, byId } = make();

            byId('issue.priority').children?.()[1].perform?.();

            expect(ctx.update).toHaveBeenCalledWith({ priority: 'low' });
        });
    });

    describe('Assign to', () => {
        test('puts "Assign to me" first, then the others, without "Unassign" when nobody is assigned', () => {
            const steps = make().byId('issue.assign').children?.() ?? [];

            expect(steps.map((c) => c.title)).toEqual([
                'Assign to me',
                'Ann',
                'Bob',
            ]);
        });

        test('"Assign to me" assigns the current user', () => {
            const { ctx, byId } = make();

            byId('issue.assign').children?.()[0].perform?.();

            expect(ctx.update).toHaveBeenCalledWith({ assignee_id: 1 });
        });

        test('an assigned issue offers Unassign last and hides the current assignee', () => {
            const { ctx, byId } = make({
                issue: baseIssue({ assignee_id: 2 }),
            });
            const steps = byId('issue.assign').children?.() ?? [];

            expect(steps.map((c) => c.title)).toEqual([
                'Assign to me',
                'Bob',
                'Unassign',
            ]);

            steps[2].perform?.();
            expect(ctx.update).toHaveBeenCalledWith({ assignee_id: null });
        });

        test('no "Assign to me" when it is already assigned to me or I am not a member', () => {
            const mine = make({ issue: baseIssue({ assignee_id: 1 }) });
            expect(
                mine
                    .byId('issue.assign')
                    .children?.()
                    .map((c) => c.title),
            ).toEqual(['Ann', 'Bob', 'Unassign']);

            const outsider = make({ currentUserId: 99 });
            expect(
                outsider
                    .byId('issue.assign')
                    .children?.()
                    .map((c) => c.title),
            ).toEqual(['Me', 'Ann', 'Bob']);
        });

        test('is hidden when there is nothing to choose', () => {
            const { visible } = make({
                users: [{ id: 1, name: 'Me' }],
                issue: baseIssue({ assignee_id: 1 }),
            });

            expect(visible()).toContain('issue.assign');
            expect(
                make({
                    users: [],
                    currentUserId: 1,
                }).visible(),
            ).not.toContain('issue.assign');
        });
    });

    describe('Labels', () => {
        test('toggles keep the step open and show the current state', () => {
            const steps = make().byId('issue.labels').children?.() ?? [];

            expect(
                steps.map((c) => [c.title, c.icon, c.subtitle, c.keepOpen]),
            ).toEqual([
                ['bug', 'SquareCheck', 'Added', true],
                ['ux', 'Square', undefined, true],
            ]);
            expect(steps[0].iconColor).toBe('#f00');
        });

        test('adding a label sends the full new list', () => {
            const { ctx, byId } = make();

            byId('issue.labels').children?.()[1].perform?.();

            expect(ctx.update).toHaveBeenCalledWith({ labels: ['bug', 'ux'] });
        });

        test('removing a label sends the list without it', () => {
            const { ctx, byId } = make();

            byId('issue.labels').children?.()[0].perform?.();

            expect(ctx.update).toHaveBeenCalledWith({ labels: [] });
        });

        test('reflects new state when rebuilt with the updated issue', () => {
            const rebuilt = make({
                issue: baseIssue({ labels: ['bug', 'ux'] }),
            });
            const steps = rebuilt.byId('issue.labels').children?.() ?? [];

            expect(steps.map((c) => c.icon)).toEqual([
                'SquareCheck',
                'SquareCheck',
            ]);
        });

        test('an issue without labels treats every label as off', () => {
            const steps =
                make({ issue: baseIssue({ labels: undefined }) })
                    .byId('issue.labels')
                    .children?.() ?? [];

            expect(steps.map((c) => c.icon)).toEqual(['Square', 'Square']);
        });
    });

    describe('copy', () => {
        test('copy link copies the absolute link', () => {
            const { ctx, byId } = make();

            byId('issue.copy-link').perform?.();

            expect(ctx.copy).toHaveBeenCalledWith(
                'https://orbit.test/projects/1/issues/42',
                'Link copied',
            );
        });

        test('copy #id copies the project-scoped number', () => {
            const { ctx, byId } = make();

            expect(byId('issue.copy-id').title).toBe('Copy #12');
            byId('issue.copy-id').perform?.();

            expect(ctx.copy).toHaveBeenCalledWith('#12', 'Copied #12');
        });
    });

    describe('hierarchy navigation', () => {
        test('no parent or child commands for a standalone issue', () => {
            const { commands } = make();

            expect(commands.map((c) => c.id)).not.toContain('issue.parent');
            expect(commands.map((c) => c.id)).not.toContain('issue.children');
        });

        test('go to parent visits the last ancestor', () => {
            const { ctx, byId } = make({
                ancestors: [
                    { id: '7', number: 1, title: 'Epic' } as Issue,
                    { id: '9', number: 5, title: 'Story' } as Issue,
                ],
            });

            expect(byId('issue.parent').subtitle).toBe('#5 Story');
            byId('issue.parent').perform?.();

            expect(ctx.visit).toHaveBeenCalledWith('/projects/1/issues/9');
        });

        test('go to child lists the children and visits the picked one', () => {
            const { ctx, byId } = make({
                issue: baseIssue({
                    children: [
                        { id: '50', number: 13, title: 'Sub A' } as Issue,
                        { id: '51', number: 14, title: 'Sub B' } as Issue,
                    ],
                }),
            });

            const steps = byId('issue.children').children?.() ?? [];
            expect(steps.map((c) => [c.prefix, c.title])).toEqual([
                ['#13', 'Sub A'],
                ['#14', 'Sub B'],
            ]);
            expect(byId('issue.children').subtitle).toBe('2');

            steps[1].perform?.();
            expect(ctx.visit).toHaveBeenCalledWith('/projects/1/issues/51');
        });
    });
});
