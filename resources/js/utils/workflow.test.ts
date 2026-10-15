import { describe, expect, test } from 'vitest';
import { Issue } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { WorkflowStatus, WorkflowTransition } from '@/types/Workflow';
import {
    getReachableStatuses,
    groupStatusesByName,
    hasCustomStatuses,
    isIssueDone,
    issueCategory,
} from './workflow';

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

const typeWith = (statuses: WorkflowStatus[]) =>
    ({ id: 1, statuses }) as unknown as IssueType;

const catStatus = (
    id: number,
    name: string,
    category: WorkflowStatus['category'],
): WorkflowStatus => ({ ...status(id, name), category });

describe('issueCategory / isIssueDone', () => {
    test('reads the category of the workflow status', () => {
        const done = { workflowStatus: catStatus(1, 'Shipped', 'done') };

        expect(issueCategory(done)).toBe('done');
        expect(isIssueDone(done)).toBe(true);
    });

    test('an issue without a loaded status counts as to do', () => {
        expect(issueCategory({})).toBe('todo');
        expect(isIssueDone({})).toBe(false);
    });
});

describe('groupStatusesByName', () => {
    test('merges same-named statuses of different types into one group with every id', () => {
        const groups = groupStatusesByName([
            typeWith([catStatus(1, 'To Do', 'todo')]),
            typeWith([catStatus(7, 'to do', 'todo')]),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].ids).toEqual([1, 7]);
    });

    test('orders groups by category and then by name', () => {
        const groups = groupStatusesByName([
            typeWith([
                catStatus(1, 'Done', 'done'),
                catStatus(2, 'In Review', 'in_progress'),
                catStatus(3, 'Backlog', 'todo'),
                catStatus(4, 'Blocked', 'todo'),
            ]),
        ]);

        expect(groups.map((g) => g.name)).toEqual([
            'Backlog',
            'Blocked',
            'In Review',
            'Done',
        ]);
    });

    test('is empty for types without statuses', () => {
        expect(groupStatusesByName([{ id: 1 } as IssueType])).toEqual([]);
    });
});

describe('hasCustomStatuses', () => {
    const groupsOf = (...pairs: [string, WorkflowStatus['category']][]) =>
        groupStatusesByName([
            typeWith(pairs.map(([name, c], i) => catStatus(i + 1, name, c))),
        ]);

    test('is false for the stock three, in any letter case', () => {
        expect(
            hasCustomStatuses(
                groupsOf(
                    ['to do', 'todo'],
                    ['In Progress', 'in_progress'],
                    ['DONE', 'done'],
                ),
            ),
        ).toBe(false);
    });

    test('is true when a status has another name', () => {
        expect(
            hasCustomStatuses(
                groupsOf(
                    ['Backlog', 'todo'],
                    ['In Progress', 'in_progress'],
                    ['Done', 'done'],
                ),
            ),
        ).toBe(true);
    });

    test('is true when a stock name sits in another category', () => {
        expect(hasCustomStatuses(groupsOf(['Done', 'in_progress']))).toBe(true);
    });

    test('is true when a category has several statuses', () => {
        expect(
            hasCustomStatuses(groupsOf(['To Do', 'todo'], ['Ready', 'todo'])),
        ).toBe(true);
    });

    test('is false for no statuses', () => {
        expect(hasCustomStatuses([])).toBe(false);
    });
});
