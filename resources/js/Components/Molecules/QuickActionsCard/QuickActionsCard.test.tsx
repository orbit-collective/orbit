import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import QuickActionsCard, { QUICK_ACTIONS } from './QuickActionsCard';

const mocks = vi.hoisted(() => ({ runCommand: vi.fn(), openPalette: vi.fn() }));

vi.mock('@/context/CommandContext', () => ({
    useCommandPalette: () => ({ runCommand: mocks.runCommand }),
}));

vi.mock('@/utils/commandPaletteEvent', () => ({
    requestOpenCommandPalette: mocks.openPalette,
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('QuickActionsCard', () => {
    test('offers every action in a group that has a name', () => {
        render(<QuickActionsCard />);

        const group = screen.getByRole('group', { name: 'Quick actions' });
        expect(within(group).getAllByRole('button')).toHaveLength(
            QUICK_ACTIONS.length,
        );
    });

    test.each([
        ['New project', 'project.create'],
        ['Projects', 'nav.projects'],
        ['Notifications', 'nav.notifications'],
        ['Edit dashboard', 'dashboard.edit'],
        ['Shortcuts', 'help.shortcuts'],
    ])('%s runs the command %s', async (label, command) => {
        render(<QuickActionsCard />);

        await userEvent.click(screen.getByRole('button', { name: label }));

        expect(mocks.runCommand).toHaveBeenCalledWith(command);
        expect(mocks.openPalette).not.toHaveBeenCalled();
    });

    test('Search opens the command palette, which is not a command of it', async () => {
        render(<QuickActionsCard />);

        await userEvent.click(screen.getByRole('button', { name: 'Search' }));

        expect(mocks.openPalette).toHaveBeenCalledOnce();
        expect(mocks.runCommand).not.toHaveBeenCalled();
    });

    test('shows only the actions that are on', () => {
        render(
            <QuickActionsCard
                enabled={{
                    search: false,
                    shortcuts: false,
                    notifications: false,
                }}
            />,
        );

        expect(
            screen.getAllByRole('button').map((b) => b.getAttribute('title')),
        ).toEqual(['New project', 'Projects', 'Edit dashboard']);
    });

    test('says what to do when no action is on', () => {
        render(
            <QuickActionsCard
                enabled={Object.fromEntries(
                    QUICK_ACTIONS.map((action) => [action.id, false]),
                )}
            />,
        );

        expect(screen.getByText(/No actions are on/)).toBeInTheDocument();
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });

    test('can leave its title out', () => {
        render(<QuickActionsCard showHeader={false} />);

        expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();
    });

    test('the list shows the keys of the actions that have them', () => {
        render(<QuickActionsCard variant="list" />);

        expect(screen.getByText('Ctrl K')).toBeInTheDocument();
        expect(screen.getByText('G P')).toBeInTheDocument();
        expect(screen.getByText('?')).toBeInTheDocument();
    });

    test('the grid and the bar do not show keys', () => {
        const { rerender } = render(<QuickActionsCard variant="grid" />);
        expect(screen.queryByText('Ctrl K')).not.toBeInTheDocument();

        rerender(<QuickActionsCard variant="bar" />);
        expect(screen.queryByText('Ctrl K')).not.toBeInTheDocument();
    });

    test('a bar of icons alone still names every button for assistive technology', () => {
        render(<QuickActionsCard variant="bar" showLabels={false} />);

        const { t } = useLaravelReactI18n();
        for (const action of QUICK_ACTIONS) {
            expect(
                screen.getByRole('button', { name: t(action.label) }),
            ).toBeInTheDocument();
        }
        expect(screen.queryByText('New project')).not.toBeInTheDocument();
    });

    test('a bar with labels shows them', () => {
        render(<QuickActionsCard variant="bar" showLabels />);

        expect(screen.getByText('New project')).toBeInTheDocument();
    });

    test('every button is big enough to press with a finger', () => {
        render(<QuickActionsCard />);

        screen
            .getAllByRole('button')
            .forEach((button) => expect(button).toHaveClass('min-h-11'));
    });

    test('every button shows where the focus is', () => {
        render(<QuickActionsCard />);

        screen
            .getAllByRole('button')
            .forEach((button) =>
                expect(button.className).toContain('focus-visible:ring-2'),
            );
    });

    test('can be used with the keyboard alone', async () => {
        render(<QuickActionsCard />);

        await userEvent.tab();
        expect(screen.getAllByRole('button')[0]).toHaveFocus();
        await userEvent.keyboard('{Enter}');

        expect(mocks.runCommand).toHaveBeenCalledWith('project.create');
    });
});
