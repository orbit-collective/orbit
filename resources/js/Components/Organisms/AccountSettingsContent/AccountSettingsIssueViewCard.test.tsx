import { render, screen, waitFor } from '@testing-library/react';
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
            container.querySelector('button > div.relative > div:last-child'),
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

describe('AccountSettingsIssueViewCard previews', () => {
    const renderView = (
        view: 'List' | 'Board' | 'Calendar' | 'Activity',
        selected = false,
    ) =>
        render(
            <AccountSettingsIssueViewCard
                view={view}
                icon="Rows3"
                description="d"
                selected={selected}
                onSelect={() => {}}
            />,
        );

    test.each(['List', 'Board', 'Calendar', 'Activity'] as const)(
        'the %s mock-up draws itself and ends up visible',
        async (view) => {
            const { container } = renderView(view);

            const stage = container.querySelector(
                'button > div.relative > div:last-child',
            ) as HTMLElement;
            await waitFor(() => expect(stage).toBeVisible());
            expect(stage.children.length).toBeGreaterThan(0);
        },
    );

    test('the board mock-up counts its cards per column', async () => {
        renderView('Board');

        expect(await screen.findAllByText('2')).toHaveLength(2);
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('the mock-up draws again when the card becomes selected, not when it is deselected', () => {
        const { container, rerender } = renderView('List');
        const stage = () =>
            container.querySelector('button > div.relative > div:last-child');
        const first = stage();

        rerender(
            <AccountSettingsIssueViewCard
                view="List"
                icon="Rows3"
                description="d"
                selected
                onSelect={() => {}}
            />,
        );
        const second = stage();
        expect(second).not.toBe(first);

        rerender(
            <AccountSettingsIssueViewCard
                view="List"
                icon="Rows3"
                description="d"
                selected={false}
                onSelect={() => {}}
            />,
        );
        expect(stage()).toBe(second);
    });
});
