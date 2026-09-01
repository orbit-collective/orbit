import { ActivityLogEntry, ActivityLogGroup } from '@/types/ActivityLog';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import ActivityLogItem from './ActivityLogItem';

describe('ActivityLogItem Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const makeEntry = (
        overrides: Partial<ActivityLogEntry> = {},
    ): ActivityLogEntry => ({
        id: 1,
        body: 'Created project: Orbit',
        userId: 7,
        userName: 'Jane Doe',
        userAvatar: null,
        createdAt: '2026-01-01T10:00:00Z',
        ...overrides,
    });

    const makeGroup = (
        overrides: Partial<ActivityLogGroup> = {},
    ): ActivityLogGroup => ({
        key: 'group-1',
        userId: 7,
        userName: 'Jane Doe',
        userAvatar: null,
        createdAt: '2026-01-01T10:00:00Z',
        entries: [makeEntry()],
        ...overrides,
    });

    test('renders the user name, entry body and a relative timestamp', () => {
        render(<ActivityLogItem group={makeGroup()} />);

        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('Created project: Orbit')).toBeInTheDocument();
        expect(screen.getByText('2h ago')).toBeInTheDocument();
    });

    test('falls back to "Someone" when the user name is null', () => {
        render(<ActivityLogItem group={makeGroup({ userName: null })} />);

        expect(screen.getByText('Someone')).toBeInTheDocument();
    });

    test('renders a line for every entry in the group', () => {
        const group = makeGroup({
            entries: [
                makeEntry({ id: 1, body: 'Changed status to Closed' }),
                makeEntry({ id: 2, body: 'Changed priority to High' }),
            ],
        });
        render(<ActivityLogItem group={group} />);

        expect(
            screen.getByText('Changed status to Closed'),
        ).toBeInTheDocument();
        expect(
            screen.getByText('Changed priority to High'),
        ).toBeInTheDocument();
        // Only one header (name + time) for the whole burst of activity.
        expect(screen.getAllByText('Jane Doe')).toHaveLength(1);
    });

    test('renders a full-width divider carrying the group time', () => {
        const { container } = render(<ActivityLogItem group={makeGroup()} />);

        const divider = container.querySelector('span[aria-hidden="true"]');
        expect(divider).not.toBeNull();
        expect(divider).toHaveClass('flex-1');
    });

    test('does not render a duplicate icon-with-background badge on the avatar', () => {
        const { container } = render(<ActivityLogItem group={makeGroup()} />);

        // The action icon appears once, plain and inline next to its entry -
        // no colored circular badge overlapping the avatar.
        expect(container.querySelector('[class*="border-2"]')).toBeNull();
    });

    test('renders status/priority/labels changes as real components, not raw text', () => {
        const group = makeGroup({
            entries: [
                makeEntry({
                    id: 1,
                    body: 'status changed from "open" to "closed"',
                }),
            ],
        });
        render(<ActivityLogItem group={group} />);

        expect(screen.getByText('open')).toBeInTheDocument();
        expect(screen.getByText('closed')).toBeInTheDocument();
        expect(
            screen.queryByText('status changed from "open" to "closed"'),
        ).not.toBeInTheDocument();
    });

    test('passes the users list through so an assignee change shows their real avatar', () => {
        const group = makeGroup({
            entries: [
                makeEntry({
                    id: 1,
                    body: 'assignee changed from "Unassigned" to "Kacper Bieliński"',
                }),
            ],
        });
        const { container } = render(
            <ActivityLogItem
                group={group}
                users={[
                    {
                        id: 1,
                        name: 'Kacper Bieliński',
                        avatar: '/storage/avatars/kacper.jpg',
                    },
                ]}
            />,
        );

        expect(
            container.querySelector('img[src="/storage/avatars/kacper.jpg"]'),
        ).not.toBeNull();
    });
});
