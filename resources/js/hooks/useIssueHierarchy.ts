import { Issue } from '@/types/Issues';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface HierarchyRow {
    issue: Issue;
    depth: number;
    hasChildren: boolean;
    isCollapsed: boolean;
}

/**
 * Builds a parent/child tree from the flat, paginated issues array (using
 * issue.parent_id) and flattens it back into a render-ready row list, each
 * with its depth and collapse state. A child whose parent isn't present in
 * the current page (split across pagination) is rendered as a top-level
 * row - this is a page-local hierarchy, not a full cross-page tree.
 * Collapsed row ids persist to localStorage per project, mirroring
 * useTableResizing's pattern.
 */
export const useIssueHierarchy = (
    issues: Issue[],
    projectId: number | string | undefined,
) => {
    const storageKey = `orbit_collapsed_issues_${projectId}`;

    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => {
        try {
            const saved =
                typeof localStorage !== 'undefined'
                    ? localStorage.getItem(storageKey)
                    : null;
            if (saved) {
                return new Set(JSON.parse(saved) as string[]);
            }
        } catch (e) {
            console.error('Failed to parse collapsed issues config', e);
        }
        return new Set();
    });

    useEffect(() => {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(storageKey, JSON.stringify([...collapsedIds]));
    }, [collapsedIds, storageKey]);

    const toggleCollapsed = useCallback((issueId: string) => {
        setCollapsedIds((prev) => {
            const next = new Set(prev);
            if (next.has(issueId)) {
                next.delete(issueId);
            } else {
                next.add(issueId);
            }
            return next;
        });
    }, []);

    const rows = useMemo<HierarchyRow[]>(() => {
        const byId = new Map(issues.map((issue) => [String(issue.id), issue]));
        const childrenByParent = new Map<string, Issue[]>();

        issues.forEach((issue) => {
            const parentId =
                issue.parent_id !== undefined && issue.parent_id !== null
                    ? String(issue.parent_id)
                    : null;

            if (parentId && byId.has(parentId)) {
                const siblings = childrenByParent.get(parentId) ?? [];
                siblings.push(issue);
                childrenByParent.set(parentId, siblings);
            }
        });

        const roots = issues.filter((issue) => {
            const parentId =
                issue.parent_id !== undefined && issue.parent_id !== null
                    ? String(issue.parent_id)
                    : null;
            return !parentId || !byId.has(parentId);
        });

        const result: HierarchyRow[] = [];

        const visit = (issue: Issue, depth: number) => {
            const children = childrenByParent.get(String(issue.id)) ?? [];
            const isCollapsed = collapsedIds.has(String(issue.id));

            result.push({
                issue,
                depth,
                hasChildren: children.length > 0,
                isCollapsed,
            });

            if (!isCollapsed) {
                children.forEach((child) => visit(child, depth + 1));
            }
        };

        roots.forEach((issue) => visit(issue, 0));

        return result;
    }, [issues, collapsedIds]);

    return { rows, toggleCollapsed };
};
