import { ActivityLogEntry } from '@/types/ActivityLog';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import ActivityLogItem from './ActivityLogItem';

describe('ActivityLogItem Component', () => {
    const makeLog = (
        overrides: Partial<ActivityLogEntry> = {},
    ): ActivityLogEntry => ({
        id: 1,
        body: 'Created project: Orbit',
        userName: 'Jane Doe',
        createdAt: '2 hours ago',
        ...overrides,
    });

    test('renders the user name, body and timestamp', () => {
        render(<ActivityLogItem log={makeLog()} />);

        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('Created project: Orbit')).toBeInTheDocument();
        expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });

    test('renders without a user name when it is null', () => {
        render(<ActivityLogItem log={makeLog({ userName: null })} />);

        expect(screen.getByText('Created project: Orbit')).toBeInTheDocument();
    });

    test('does not render the timeline connector for the last item', () => {
        const { container } = render(
            <ActivityLogItem log={makeLog()} isLast />,
        );

        expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
    });
});
