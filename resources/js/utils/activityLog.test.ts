import { ActivityLogEntry } from '@/types/ActivityLog';
import { describe, expect, test } from 'vitest';
import { getActivityLogVisual, groupActivityLogs } from './activityLog';

describe('getActivityLogVisual', () => {
    test('matches a rule based on the body text', () => {
        expect(getActivityLogVisual('Created project: Orbit')).toEqual({
            icon: 'Plus',
            color: 'success',
        });
        expect(getActivityLogVisual('Deleted issue #4')).toEqual({
            icon: 'Trash2',
            color: 'error',
        });
    });

    test('falls back to the default visual when nothing matches', () => {
        expect(getActivityLogVisual('Did something unusual')).toEqual({
            icon: 'Activity',
            color: 'accent',
        });
    });
});

describe('groupActivityLogs', () => {
    const makeEntry = (
        overrides: Partial<ActivityLogEntry> = {},
    ): ActivityLogEntry => ({
        id: 1,
        body: 'Did something',
        userId: 1,
        userName: 'Jane Doe',
        userAvatar: null,
        createdAt: '2026-01-01T10:00:00Z',
        ...overrides,
    });

    test('keeps a single entry as its own group', () => {
        const groups = groupActivityLogs([makeEntry()]);

        expect(groups).toHaveLength(1);
        expect(groups[0].entries).toHaveLength(1);
    });

    test('merges consecutive entries from the same user within the same minute', () => {
        const groups = groupActivityLogs([
            makeEntry({ id: 1, createdAt: '2026-01-01T10:00:05Z' }),
            makeEntry({ id: 2, createdAt: '2026-01-01T10:00:42Z' }),
        ]);

        expect(groups).toHaveLength(1);
        expect(groups[0].entries.map((e) => e.id)).toEqual([1, 2]);
    });

    test('does not merge entries in different minutes', () => {
        const groups = groupActivityLogs([
            makeEntry({ id: 1, createdAt: '2026-01-01T10:00:59Z' }),
            makeEntry({ id: 2, createdAt: '2026-01-01T10:01:00Z' }),
        ]);

        expect(groups).toHaveLength(2);
    });

    test('does not merge entries from different users in the same minute', () => {
        const groups = groupActivityLogs([
            makeEntry({ id: 1, userId: 1, createdAt: '2026-01-01T10:00:05Z' }),
            makeEntry({ id: 2, userId: 2, createdAt: '2026-01-01T10:00:10Z' }),
        ]);

        expect(groups).toHaveLength(2);
    });

    test('does not merge same-minute entries from the same user across a gap', () => {
        const groups = groupActivityLogs([
            makeEntry({ id: 1, userId: 1, createdAt: '2026-01-01T10:00:05Z' }),
            makeEntry({ id: 2, userId: 2, createdAt: '2026-01-01T10:00:07Z' }),
            makeEntry({ id: 3, userId: 1, createdAt: '2026-01-01T10:00:09Z' }),
        ]);

        // The entry from user 2 in between breaks up the two user-1 entries,
        // even though all three share the same minute.
        expect(groups).toHaveLength(3);
    });
});
