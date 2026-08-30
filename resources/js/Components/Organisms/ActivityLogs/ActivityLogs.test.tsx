import { ActivityLogEntry } from '@/types/ActivityLog';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import ActivityLogs from './ActivityLogs';

describe('ActivityLogs Component', () => {
    const logs: ActivityLogEntry[] = [
        {
            id: 1,
            body: 'Created project: Orbit',
            userName: 'Jane Doe',
            createdAt: '2 hours ago',
        },
        {
            id: 2,
            body: 'Deleted issue #4 "Bug"',
            userName: 'John Smith',
            createdAt: '1 day ago',
        },
    ];

    test('renders an item for each log entry', () => {
        render(<ActivityLogs logs={logs} />);

        expect(screen.getByText('Created project: Orbit')).toBeInTheDocument();
        expect(screen.getByText('Deleted issue #4 "Bug"')).toBeInTheDocument();
    });

    test('renders an empty state when there are no logs', () => {
        render(<ActivityLogs logs={[]} />);

        expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
});
