import { Issue } from '@/types/Issues';
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
