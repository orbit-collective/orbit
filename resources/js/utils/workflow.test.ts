import { describe, expect, test } from 'vitest';
import { Issue } from '@/types/Issues';
import { WorkflowStatus, WorkflowTransition } from '@/types/Workflow';
import { getReachableStatuses } from './workflow';

const status = (id: number, name: string): WorkflowStatus => ({
    id,
    issueTypeId: 1,
    name,
    color: '#000',
    category: 'todo' as WorkflowStatus['category'],
    isInitial: id === 1,
});
const transition = (from: number, to: number): WorkflowTransition => ({
    id: from * 10 + to,
    issueTypeId: 1,
    fromStatusId: from,
    toStatusId: to,
});

const issue = (overrides: Partial<Issue> = {}): Issue =>
    ({
        id: '1',
        title: 't',
        status: 'open',
        priority: 'low',
        project_id: 1,
        user_id: 1,
        issueType: {
            statuses: [
                status(1, 'Todo'),
                status(2, 'Doing'),
                status(3, 'Done'),
            ],
            transitions: [transition(1, 2), transition(2, 3), transition(2, 1)],
        },
        workflowStatus: status(1, 'Todo'),
        ...overrides,
    }) as unknown as Issue;

describe('getReachableStatuses', () => {
    test('returns the current status plus the ones a transition allows', () => {
        expect(getReachableStatuses(issue()).map((s) => s.name)).toEqual([
            'Todo',
            'Doing',
        ]);
    });

    test('follows transitions from whichever status the issue is in', () => {
        const doing = issue({ workflowStatus: status(2, 'Doing') });

        expect(getReachableStatuses(doing).map((s) => s.name)).toEqual([
            'Todo',
            'Doing',
            'Done',
        ]);
    });

    test('a status with no outgoing transitions can only stay where it is', () => {
        const done = issue({ workflowStatus: status(3, 'Done') });

        expect(getReachableStatuses(done).map((s) => s.name)).toEqual(['Done']);
    });

    test('a legacy issue without a current status can reach every status', () => {
        expect(
            getReachableStatuses(issue({ workflowStatus: undefined })),
        ).toHaveLength(3);
    });

    test('is empty when the issue has no type or workflow', () => {
        expect(getReachableStatuses(issue({ issueType: undefined }))).toEqual(
            [],
        );
    });
});
