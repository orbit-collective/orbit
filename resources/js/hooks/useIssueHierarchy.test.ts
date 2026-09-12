import { Issue } from '@/types/Issues';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { useIssueHierarchy } from './useIssueHierarchy';

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '1',
    title: 'Issue',
    status: 'open',
    priority: 'medium',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

beforeEach(() => {
    localStorage.clear();
});

describe('useIssueHierarchy', () => {
    test('renders root issues in order when there is no hierarchy', () => {
        const issues = [
            makeIssue({ id: '1', title: 'A' }),
            makeIssue({ id: '2', title: 'B' }),
        ];

        const { result } = renderHook(() => useIssueHierarchy(issues, 1));

        expect(result.current.rows.map((r) => r.issue.title)).toEqual([
            'A',
            'B',
        ]);
        expect(result.current.rows.every((r) => r.depth === 0)).toBe(true);
    });

    test('nests a child directly beneath its parent with depth 1', () => {
        const issues = [
            makeIssue({ id: '1', title: 'Epic' }),
            makeIssue({ id: '2', title: 'Child', parent_id: '1' }),
            makeIssue({ id: '3', title: 'Other root' }),
        ];

        const { result } = renderHook(() => useIssueHierarchy(issues, 1));

        expect(result.current.rows.map((r) => r.issue.title)).toEqual([
            'Epic',
            'Child',
            'Other root',
        ]);
        expect(result.current.rows[0].hasChildren).toBe(true);
        expect(result.current.rows[1].depth).toBe(1);
    });

    test('treats a child whose parent is not in the current page as a root row', () => {
        const issues = [
            makeIssue({ id: '2', title: 'Orphaned child', parent_id: '999' }),
        ];

        const { result } = renderHook(() => useIssueHierarchy(issues, 1));

        expect(result.current.rows).toHaveLength(1);
        expect(result.current.rows[0].depth).toBe(0);
    });

    test('collapsing a parent hides its children from the rendered rows', () => {
        const issues = [
            makeIssue({ id: '1', title: 'Epic' }),
            makeIssue({ id: '2', title: 'Child', parent_id: '1' }),
        ];

        const { result } = renderHook(() => useIssueHierarchy(issues, 1));

        act(() => result.current.toggleCollapsed('1'));

        expect(result.current.rows.map((r) => r.issue.title)).toEqual(['Epic']);
        expect(result.current.rows[0].isCollapsed).toBe(true);
    });

    test('persists collapsed state to localStorage per project and restores it', () => {
        const issues = [
            makeIssue({ id: '1', title: 'Epic' }),
            makeIssue({ id: '2', title: 'Child', parent_id: '1' }),
        ];

        const { result, unmount } = renderHook(() =>
            useIssueHierarchy(issues, 42),
        );
        act(() => result.current.toggleCollapsed('1'));
        unmount();

        const { result: second } = renderHook(() =>
            useIssueHierarchy(issues, 42),
        );

        expect(second.current.rows.map((r) => r.issue.title)).toEqual(['Epic']);
    });
});
