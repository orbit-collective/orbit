import type { FormDataConvertible } from '@inertiajs/core';
import { Command } from '@/types/Commands';
import { Issue, IssueAbilities } from '@/types/Issues';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { AssignableUser } from '@/types/Users';
import { resolvePriorityIcon } from '@/utils/priorityIcons';
import { getReachableStatuses } from '@/utils/workflow';

export interface IssueCommandContext {
    issue: Issue;
    /** The issue's ancestors, root-first, so the last one is its parent. */
    ancestors: Issue[];
    users: AssignableUser[];
    labels: ProjectLabel[];
    priorities: ProjectPriority[];
    abilities: IssueAbilities;
    currentUserId: number;
    /** Absolute link to the issue, for "Copy link". */
    link: string;
    issueUrl: (id: number | string) => string;
    update: (data: Record<string, FormDataConvertible>) => void;
    copy: (text: string, successMessage: string) => void;
    visit: (url: string) => void;
    /** Translator; the English wording is used when it is not given. */
    t?: (key: string, replacements?: Record<string, string | number>) => string;
}

const issueLabel = (issue: Issue): string => `#${issue.number ?? issue.id}`;

/**
 * The commands for one issue, led by the "Suggested" group on its page. Each
 * is gated by `when()` on the same ability the controller enforces, so an
 * action the user cannot perform is hidden rather than offered and rejected.
 * Rebuilt on every render of the page, which is how a step like "Labels"
 * reflects state after a toggle.
 */
export const buildIssueCommands = (ctx: IssueCommandContext): Command[] => {
    const { issue, abilities, users, labels, priorities } = ctx;
    const context = issueLabel(issue);
    const tr = (
        key: string,
        english: string,
        replacements?: Record<string, string | number>,
    ): string =>
        ctx.t ? ctx.t(`util_issue_commands.${key}`, replacements) : english;
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

    const prioritySteps = (): Command[] => {
        const steps = priorities
            .filter((priority) => priority.id !== issue.priority_id)
            .map((priority): Command => ({
                id: `issue.priority.${priority.id}`,
                title: priority.name,
                group: 'suggested',
                icon: resolvePriorityIcon(priority.icon),
                iconColor: priority.color,
                perform: () => ctx.update({ priority: priority.name }),
            }));

        if (issue.priority_id != null) {
            steps.push({
                id: 'issue.priority.none',
                title: tr('no_priority', 'No priority'),
                group: 'suggested',
                icon: 'CircleDashed',
                perform: () => ctx.update({ priority: null }),
            });
        }

        return steps;
    };

    const assigneeSteps = (): Command[] => {
        const steps: Command[] = [];
        const me = users.find((user) => user.id === ctx.currentUserId);

        if (me && issue.assignee_id !== me.id) {
            steps.push({
                id: 'issue.assign.me',
                title: tr('assign_me', 'Assign to me'),
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
                title: tr('unassign', 'Unassign'),
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
                subtitle: active ? tr('added', 'Added') : undefined,
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
            title: tr('change_status', 'Change status…'),
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
            title: tr('change_priority', 'Change priority…'),
            subtitle: issue.priority ?? undefined,
            icon: 'Flag',
            keywords: ['urgent', 'importance'],
            when: () => canUpdate && abilities.changePriority,
            children: prioritySteps,
        },
        {
            ...base,
            id: 'issue.assign',
            title: tr('assign_to', 'Assign to…'),
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
            title: tr('labels', 'Labels…'),
            icon: 'Tag',
            keywords: ['tag', 'label'],
            when: () =>
                canUpdate && abilities.changeLabels && labels.length > 0,
            children: labelSteps,
        },
        {
            ...base,
            id: 'issue.copy-link',
            title: tr('copy_link', 'Copy link'),
            icon: 'Link',
            keywords: ['url', 'share'],
            perform: () => ctx.copy(ctx.link, tr('link_copied', 'Link copied')),
        },
        {
            ...base,
            id: 'issue.copy-id',
            title: tr('copy_id', `Copy ${context}`, { id: context }),
            icon: 'Hash',
            keywords: ['id', 'number'],
            perform: () =>
                ctx.copy(
                    context,
                    tr('copied_id', `Copied ${context}`, { id: context }),
                ),
        },
    ];

    if (parent) {
        commands.push({
            ...base,
            id: 'issue.parent',
            title: tr('go_parent', 'Go to parent'),
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
            title: tr('go_child', 'Go to child…'),
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
