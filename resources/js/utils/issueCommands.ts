import type { FormDataConvertible } from '@inertiajs/core';
import { Command } from '@/types/Commands';
import { Issue, IssueAbilities, IssuePriority } from '@/types/Issues';
import { ProjectLabel } from '@/types/Labels';
import { AssignableUser } from '@/types/Users';
import { getReachableStatuses } from '@/utils/workflow';

export interface IssueCommandContext {
    issue: Issue;
    /** The issue's ancestors, root-first, so the last one is its parent. */
    ancestors: Issue[];
    users: AssignableUser[];
    labels: ProjectLabel[];
    abilities: IssueAbilities;
    currentUserId: number;
    /** Absolute link to the issue, for "Copy link". */
    link: string;
    issueUrl: (id: number | string) => string;
    update: (data: Record<string, FormDataConvertible>) => void;
    copy: (text: string, successMessage: string) => void;
    visit: (url: string) => void;
}

const PRIORITIES: { value: IssuePriority; icon: Command['icon'] }[] = [
    { value: 'high', icon: 'ArrowUp' },
    { value: 'medium', icon: 'Minus' },
    { value: 'low', icon: 'ArrowDown' },
];

const issueLabel = (issue: Issue): string => `#${issue.number ?? issue.id}`;

/**
 * The commands for one issue, led by the "Suggested" group on its page. Each
 * is gated by `when()` on the same ability the controller enforces, so an
 * action the user cannot perform is hidden rather than offered and rejected.
 * Rebuilt on every render of the page, which is how a step like "Labels"
 * reflects state after a toggle.
 */
export const buildIssueCommands = (ctx: IssueCommandContext): Command[] => {
    const { issue, abilities, users, labels } = ctx;
    const context = issueLabel(issue);
    const base = {
        group: 'suggested',
        scope: 'issue',
        context,
    } as const;

    const currentStatusId = issue.workflowStatus?.id ?? null;

    const statusSteps = (): Command[] =>
        getReachableStatuses(issue)
            .filter((status) => status.id !== currentStatusId)
            .map((status): Command => ({
                id: `issue.status.${status.id}`,
                title: status.name,
                group: 'suggested',
                icon: 'Circle',
                iconColor: status.color,
                perform: () => ctx.update({ workflow_status_id: status.id }),
            }));

    const prioritySteps = (): Command[] =>
        PRIORITIES.filter(({ value }) => value !== issue.priority).map(
            ({ value, icon }): Command => ({
                id: `issue.priority.${value}`,
                title: value.charAt(0).toUpperCase() + value.slice(1),
                group: 'suggested',
                icon,
                perform: () => ctx.update({ priority: value }),
            }),
        );

    const assigneeSteps = (): Command[] => {
        const steps: Command[] = [];
        const me = users.find((user) => user.id === ctx.currentUserId);

        if (me && issue.assignee_id !== me.id) {
            steps.push({
                id: 'issue.assign.me',
                title: 'Assign to me',
                subtitle: me.name,
                group: 'suggested',
                icon: 'UserCheck',
                perform: () => ctx.update({ assignee_id: me.id }),
            });
        }

        users
            .filter(
                (user) =>
                    user.id !== ctx.currentUserId &&
                    user.id !== issue.assignee_id,
            )
            .forEach((user) =>
                steps.push({
                    id: `issue.assign.${user.id}`,
                    title: user.name,
                    group: 'suggested',
                    icon: 'User',
                    perform: () => ctx.update({ assignee_id: user.id }),
                }),
            );

        if (issue.assignee_id) {
            steps.push({
                id: 'issue.assign.none',
                title: 'Unassign',
                group: 'suggested',
                icon: 'UserX',
                perform: () => ctx.update({ assignee_id: null }),
            });
        }

        return steps;
    };

    const labelSteps = (): Command[] => {
        const current = issue.labels ?? [];

        return labels.map((label): Command => {
            const active = current.includes(label.name);

            return {
                id: `issue.labels.${label.id}`,
                title: label.name,
                subtitle: active ? 'Added' : undefined,
                group: 'suggested',
                icon: active ? 'SquareCheck' : 'Square',
                iconColor: label.color,
                keepOpen: true,
                perform: () =>
                    ctx.update({
                        labels: active
                            ? current.filter((name) => name !== label.name)
                            : [...current, label.name],
                    }),
            };
        });
    };

    const parent = ctx.ancestors[ctx.ancestors.length - 1];
    const children = issue.children ?? [];
    const canUpdate = abilities.update;

    const commands: Command[] = [
        {
            ...base,
            id: 'issue.status',
            title: 'Change status…',
            subtitle: issue.workflowStatus?.name,
            icon: 'CircleDot',
            keywords: ['workflow', 'transition', 'state', 'move'],
            when: () =>
                canUpdate && abilities.changeStatus && statusSteps().length > 0,
            children: statusSteps,
        },
        {
            ...base,
            id: 'issue.priority',
            title: 'Change priority…',
            subtitle: issue.priority,
            icon: 'Flag',
            keywords: ['urgent', 'importance'],
            when: () => canUpdate && abilities.changePriority,
            children: prioritySteps,
        },
        {
            ...base,
            id: 'issue.assign',
            title: 'Assign to…',
            subtitle: issue.assignee?.name,
            icon: 'UserPlus',
            keywords: ['assignee', 'owner', 'member', 'unassign'],
            when: () =>
                canUpdate && abilities.assign && assigneeSteps().length > 0,
            children: assigneeSteps,
        },
        {
            ...base,
            id: 'issue.labels',
            title: 'Labels…',
            icon: 'Tag',
            keywords: ['tag', 'label'],
            when: () =>
                canUpdate && abilities.changeLabels && labels.length > 0,
            children: labelSteps,
        },
        {
            ...base,
            id: 'issue.copy-link',
            title: 'Copy link',
            icon: 'Link',
            keywords: ['url', 'share'],
            perform: () => ctx.copy(ctx.link, 'Link copied'),
        },
        {
            ...base,
            id: 'issue.copy-id',
            title: `Copy ${context}`,
            icon: 'Hash',
            keywords: ['id', 'number'],
            perform: () => ctx.copy(context, `Copied ${context}`),
        },
    ];

    if (parent) {
        commands.push({
            ...base,
            id: 'issue.parent',
            title: 'Go to parent',
            subtitle: `${issueLabel(parent)} ${parent.title}`,
            icon: 'CornerLeftUp',
            keywords: ['up', 'epic', 'ancestor'],
            perform: () => ctx.visit(ctx.issueUrl(parent.id)),
        });
    }

    if (children.length > 0) {
        commands.push({
            ...base,
            id: 'issue.children',
            title: 'Go to child…',
            subtitle: `${children.length}`,
            icon: 'ListTree',
            keywords: ['sub-issue', 'subtask', 'down'],
            children: () =>
                children.map((child): Command => ({
                    id: `issue.child.${child.id}`,
                    title: child.title,
                    prefix: issueLabel(child),
                    group: 'suggested',
                    icon: 'CircleDot',
                    perform: () => ctx.visit(ctx.issueUrl(child.id)),
                })),
        });
    }

    return commands;
};
