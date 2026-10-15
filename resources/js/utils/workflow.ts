import { Issue } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { WorkflowStatus, WorkflowStatusCategory } from '@/types/Workflow';

/**
 * Statuses the workflow actually permits moving this issue to - the current
 * one plus every status reachable through a `WorkflowTransition` - so a picker
 * can't offer a transition the backend would reject. With no current status
 * yet (a legacy issue), every status is reachable.
 */
export const getReachableStatuses = (issue: Issue): WorkflowStatus[] => {
    const statuses = issue.issueType?.statuses ?? [];
    const transitions = issue.issueType?.transitions ?? [];
    const currentId = issue.workflowStatus?.id ?? null;

    return statuses.filter(
        (status) =>
            currentId === null ||
            status.id === currentId ||
            transitions.some(
                (transition) =>
                    transition.fromStatusId === currentId &&
                    transition.toStatusId === status.id,
            ),
    );
};

/**
 * The category of the issue's workflow status - the only status notion the
 * board, counters and filters share, since each issue type names its own
 * statuses. An issue without a loaded status counts as to do.
 */
export const issueCategory = (
    issue: Pick<Issue, 'workflowStatus'>,
): WorkflowStatusCategory => issue.workflowStatus?.category ?? 'todo';

export const isIssueDone = (issue: Pick<Issue, 'workflowStatus'>): boolean =>
    issueCategory(issue) === 'done';

export interface StatusGroup {
    name: string;
    color: string;
    category: WorkflowStatusCategory;
    /** Every status id sharing this name, one per issue type that has it. */
    ids: number[];
}

const CATEGORY_ORDER: Record<WorkflowStatusCategory, number> = {
    todo: 0,
    in_progress: 1,
    done: 2,
};

/**
 * The statuses of all the given issue types, merged by name: each type owns
 * its own copy of "To Do" or "In Review", but a filter wants one entry per
 * name that selects all of them. Ordered by category, then name.
 */
export const groupStatusesByName = (issueTypes: IssueType[]): StatusGroup[] => {
    const groups = new Map<string, StatusGroup>();

    issueTypes
        .flatMap((type) => type.statuses ?? [])
        .forEach((status) => {
            const key = status.name.toLowerCase();
            const group = groups.get(key);

            if (group) {
                group.ids.push(status.id);
            } else {
                groups.set(key, {
                    name: status.name,
                    color: status.color,
                    category: status.category,
                    ids: [status.id],
                });
            }
        });

    return [...groups.values()].sort(
        (a, b) =>
            CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category] ||
            a.name.localeCompare(b.name),
    );
};

const STOCK_STATUSES: Record<string, WorkflowStatusCategory> = {
    'to do': 'todo',
    'in progress': 'in_progress',
    done: 'done',
};

/**
 * Whether the groups hold anything beyond the stock To Do / In Progress /
 * Done: a status named otherwise, a stock name in another category, or a
 * category with more than one status. Counting names is not enough, a
 * Backlog / Ready / Done workflow also has three.
 */
export const hasCustomStatuses = (groups: StatusGroup[]): boolean =>
    groups.some(
        (group) => STOCK_STATUSES[group.name.toLowerCase()] !== group.category,
    ) || new Set(groups.map((group) => group.category)).size < groups.length;
