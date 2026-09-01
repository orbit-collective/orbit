import { ActivityLogEntry } from '@/types/ActivityLog';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ActivityLogs from './ActivityLogs';

describe('ActivityLogs Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const logs: ActivityLogEntry[] = [
        {
            id: 1,
            body: 'Created project: Orbit',
            userId: 1,
            userName: 'Jane Doe',
            userAvatar: null,
            createdAt: '2026-01-01T10:00:00Z',
        },
        {
            id: 2,
            body: 'Deleted issue #4 "Bug"',
            userId: 2,
            userName: 'John Smith',
            userAvatar: null,
            createdAt: '2026-01-01T09:00:00Z',
        },
    ];

    test('renders an item for each log entry', () => {
        render(<ActivityLogs logs={logs} />);

        expect(screen.getByText('Created project: Orbit')).toBeInTheDocument();
        expect(screen.getByText('Deleted issue #4 "Bug"')).toBeInTheDocument();
    });

    test('groups consecutive entries from the same person in the same minute', () => {
        const burst: ActivityLogEntry[] = [
            {
                id: 3,
                body: 'Changed status to Closed',
                userId: 1,
                userName: 'Jane Doe',
                userAvatar: null,
                createdAt: '2026-01-01T10:00:05Z',
            },
            {
                id: 4,
                body: 'Changed priority to High',
                userId: 1,
                userName: 'Jane Doe',
                userAvatar: null,
                createdAt: '2026-01-01T10:00:42Z',
            },
        ];

        render(<ActivityLogs logs={burst} />);

        // One header for the burst, both bodies rendered underneath it.
        expect(screen.getAllByText('Jane Doe')).toHaveLength(1);
        expect(
            screen.getByText('Changed status to Closed'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Changed priority to High'),
        ).toBeInTheDocument();
    });

    test('renders an empty state when there are no logs', () => {
        render(<ActivityLogs logs={[]} />);

        expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
});
