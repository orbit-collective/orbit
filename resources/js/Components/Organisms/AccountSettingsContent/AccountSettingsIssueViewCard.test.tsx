import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsIssueViewCard from './AccountSettingsIssueViewCard';

describe('AccountSettingsIssueViewCard Component', () => {
    test('renders the view name and description', () => {
        render(
            <AccountSettingsIssueViewCard
                view="List"
                icon="Rows3"
                description="A dense, sortable table of every issue."
                selected={false}
                onSelect={() => {}}
            />,
        );

        expect(screen.getByText('List')).toBeInTheDocument();
        expect(
            screen.getByText('A dense, sortable table of every issue.'),
        ).toBeInTheDocument();
    });

    test('calls onSelect when clicked', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        render(
            <AccountSettingsIssueViewCard
                view="Board"
                icon="Columns3"
                description="Kanban columns grouped by status or priority."
                selected={false}
                onSelect={onSelect}
            />,
        );

        await user.click(screen.getByRole('button'));

        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    test.each([
        ['List', 'Rows3'],
        ['Board', 'Columns3'],
        ['Calendar', 'CalendarDays'],
        ['Activity', 'Activity'],
    ] as const)('renders a distinct preview for the %s view', (view, icon) => {
        const { container } = render(
            <AccountSettingsIssueViewCard
                view={view}
                icon={icon}
                description="Preview description"
                selected={false}
                onSelect={() => {}}
            />,
        );

        expect(
            container.querySelector('button > div:last-child'),
        ).not.toBeNull();
    });

    test('renders a timeline preview with three connected entries for the Activity view', () => {
        const { container } = render(
            <AccountSettingsIssueViewCard
                view="Activity"
                icon="Activity"
                description="A chronological feed of all issue activity."
                selected={false}
                onSelect={() => {}}
            />,
        );

        const dots = container.querySelectorAll(
            '.rounded-full.h-1\\.5.w-1\\.5',
        );
        expect(dots.length).toBe(3);
    });
});
