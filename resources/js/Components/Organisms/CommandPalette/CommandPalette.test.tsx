import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';

vi.mock('@/Components/Organisms/ShortcutHelpModal/ShortcutHelpModal', () => ({
    ShortcutHelpModal: () => null,
}));

import { CommandProvider } from '@/context/CommandContext';
import { ModalProvider, useModal } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { useCommands } from '@/hooks/useCommands';
import { areShortcutsSuspended } from '@/utils/shortcutSuspension';
import CommandPalette from './CommandPalette';

const makeCommand = (
    overrides: Partial<Command> & Pick<Command, 'id'>,
): Command => ({
    title: overrides.id,
    group: 'navigation',
    icon: 'Search',
    ...overrides,
});

let palette!: ReturnType<typeof useCommands>;
let anyModalOpen = () => false;

const Harness = ({ commands }: { commands: Command[] }) => {
    palette = useCommands(commands);
    anyModalOpen = useModal().getIfAnyModalIsOpened;
    return (
        <>
            <button>trigger</button>
            <CommandPalette />
        </>
    );
};

const Providers = ({ children }: { children: ReactNode }) => (
    <ModalProvider>
        <ShortcutProvider>
            <CommandProvider>{children}</CommandProvider>
        </ShortcutProvider>
    </ModalProvider>
);

const setup = (commands: Command[]) => {
    render(
        <Providers>
            <Harness commands={commands} />
        </Providers>,
    );
    return userEvent.setup();
};

const open = (mode?: 'default' | 'search') =>
    act(() => palette.openPalette(mode));

const optionNames = () =>
    screen.queryAllByRole('option').map((o) => o.textContent ?? '');

const dashboard = makeCommand({
    id: 'nav.dashboard',
    title: 'Go to Dashboard',
    shortcut: 'alt+b',
    perform: vi.fn(),
});
const createIssue = makeCommand({
    id: 'issue.create',
    title: 'Create issue',
    group: 'creation',
    perform: vi.fn(),
});
const createProject = makeCommand({
    id: 'project.create',
    title: 'Create project',
    group: 'creation',
});
const darkTheme = makeCommand({
    id: 'theme.dark',
    title: 'Switch to dark theme',
    group: 'preferences',
    keywords: ['appearance'],
});
const BASE = [dashboard, createIssue, createProject, darkTheme];

describe('CommandPalette', () => {
    test('renders nothing while closed', () => {
        setup(BASE);

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('opens as a modal dialog with a focused combobox', () => {
        setup(BASE);
        open();

        const dialog = screen.getByRole('dialog', { name: 'Command palette' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        const input = screen.getByRole('combobox');
        expect(input).toHaveFocus();
        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(input).toHaveAttribute(
            'placeholder',
            'Type a command or search...',
        );
    });

    test('uses a search placeholder in search mode', () => {
        setup(BASE);
        open('search');

        expect(screen.getByRole('combobox')).toHaveAttribute(
            'placeholder',
            'Search...',
        );
    });

    test('lists every command grouped in the fixed order', () => {
        setup(BASE);
        open();

        expect(
            screen
                .getAllByRole('group')
                .map((g) => g.getAttribute('aria-labelledby')),
        ).toHaveLength(3);
        expect(
            screen
                .getAllByRole('group')
                .map((g) => within(g).getAllByRole('option').length),
        ).toEqual([1, 2, 1]);
        expect(optionNames()).toEqual([
            expect.stringContaining('Go to Dashboard'),
            'Create issue',
            'Create project',
            'Switch to dark theme',
        ]);
    });

    test('shows the shortcut chips of a command', () => {
        setup(BASE);
        open();

        const option = screen.getAllByRole('option')[0];
        expect(within(option).getByText('B')).toBeInTheDocument();
    });

    test('"crt iss" ranks "Create issue" first and highlights the match', async () => {
        const user = setup(BASE);
        open();

        await user.type(screen.getByRole('combobox'), 'crt iss');

        const options = screen.getAllByRole('option');
        expect(options[0]).toHaveTextContent('Create issue');
        expect(options[0].querySelectorAll('mark').length).toBeGreaterThan(0);
    });

    test('matches keywords as well as titles', async () => {
        const user = setup(BASE);
        open();

        await user.type(screen.getByRole('combobox'), 'appearance');

        expect(optionNames()).toEqual(['Switch to dark theme']);
    });

    test('hides commands whose when() is false', () => {
        setup([
            ...BASE,
            makeCommand({ id: 'secret', title: 'Secret', when: () => false }),
        ]);
        open();

        expect(screen.queryByText('Secret')).not.toBeInTheDocument();
    });

    test('shows a no-results state and announces it', async () => {
        const user = setup(BASE);
        open();

        await user.type(screen.getByRole('combobox'), 'zzzzz');

        expect(screen.getByText('No results for "zzzzz"')).toBeInTheDocument();
        expect(screen.getByTestId('command-palette-live')).toHaveTextContent(
            'No results',
        );
        expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    test('shows an empty state when no command is registered', () => {
        setup([]);
        open();

        expect(screen.getByText('No commands available')).toBeInTheDocument();
    });

    test('announces the result count politely', async () => {
        const user = setup(BASE);
        open();

        const live = screen.getByTestId('command-palette-live');
        expect(live).toHaveAttribute('aria-live', 'polite');
        expect(live).toHaveTextContent('4 results');

        await user.type(screen.getByRole('combobox'), 'appearance');
        expect(live).toHaveTextContent('1 result');
    });

    describe('keyboard', () => {
        test('arrow keys follow the on-screen order across groups', async () => {
            const user = setup(BASE);
            open();
            const input = screen.getByRole('combobox');
            const activeText = () =>
                document.getElementById(
                    input.getAttribute('aria-activedescendant') as string,
                )?.textContent;

            expect(activeText()).toContain('Go to Dashboard');
            await user.keyboard('{ArrowDown}');
            expect(activeText()).toBe('Create issue');
            await user.keyboard('{ArrowDown}');
            expect(activeText()).toBe('Create project');
            await user.keyboard('{ArrowDown}');
            expect(activeText()).toBe('Switch to dark theme');
            await user.keyboard('{ArrowUp}');
            expect(activeText()).toBe('Create project');
        });

        test('arrows wrap around at both ends', async () => {
            const user = setup(BASE);
            open();
            const options = () => screen.getAllByRole('option');

            await user.keyboard('{ArrowUp}');
            expect(options()[3]).toHaveAttribute('aria-selected', 'true');

            await user.keyboard('{ArrowDown}');
            expect(options()[0]).toHaveAttribute('aria-selected', 'true');
        });

        test('Enter runs the active command and closes the palette', async () => {
            const perform = vi.fn();
            const user = setup([
                makeCommand({ id: 'a', title: 'Alpha', perform }),
                makeCommand({ id: 'b', title: 'Beta' }),
            ]);
            open();

            await user.keyboard('{Enter}');

            expect(perform).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('Enter does nothing when there are no results', async () => {
            const user = setup(BASE);
            open();

            await user.type(screen.getByRole('combobox'), 'zzzzz{Enter}');

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });

        test('typing resets the active row to the first match', async () => {
            const user = setup(BASE);
            open();

            await user.keyboard('{ArrowDown}{ArrowDown}');
            await user.type(screen.getByRole('combobox'), 'c');

            expect(screen.getAllByRole('option')[0]).toHaveAttribute(
                'aria-selected',
                'true',
            );
        });

        test('Escape closes the palette', async () => {
            const user = setup(BASE);
            open();

            await user.keyboard('{Escape}');

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('mod+k inside the input closes the palette', async () => {
            const user = setup(BASE);
            open();

            await user.keyboard('{Control>}k{/Control}');

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('Tab never moves focus out of the dialog', async () => {
            const user = setup(BASE);
            open();

            await user.tab();
            expect(screen.getByRole('combobox')).toHaveFocus();
            await user.tab({ shift: true });
            expect(screen.getByRole('combobox')).toHaveFocus();
        });
    });

    describe('mouse', () => {
        test('clicking a row runs its command', async () => {
            const user = setup(BASE);
            open();

            await user.click(screen.getByText('Create issue'));

            expect(createIssue.perform).toHaveBeenCalled();
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('hovering a row makes it the active one', async () => {
            const user = setup(BASE);
            open();

            await user.hover(screen.getByText('Create project'));

            expect(
                screen.getByRole('option', { name: 'Create project' }),
            ).toHaveAttribute('aria-selected', 'true');
            expect(screen.getAllByRole('option')[0]).toHaveAttribute(
                'aria-selected',
                'false',
            );
        });

        test('clicking a row keeps keyboard focus in the input', async () => {
            const user = setup([
                makeCommand({
                    id: 'issue.status',
                    title: 'Change status',
                    children: () => [makeCommand({ id: 'x', title: 'X' })],
                }),
            ]);
            open();

            await user.click(screen.getByText('Change status'));

            expect(screen.getByRole('combobox')).toHaveFocus();
        });

        test('clicking the backdrop closes the palette', async () => {
            const user = setup(BASE);
            open();

            await user.click(screen.getByTestId('command-palette-backdrop'));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('nested steps', () => {
        const parent = makeCommand({
            id: 'issue.status',
            title: 'Change status',
            children: () => [
                makeCommand({ id: 'status.todo', title: 'To do' }),
                makeCommand({ id: 'status.done', title: 'Done' }),
            ],
        });

        test('a command with children opens a step with a breadcrumb', async () => {
            const user = setup([parent, dashboard]);
            open();

            await user.click(screen.getByText('Change status'));

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(optionNames()).toEqual(['To do', 'Done']);
            expect(
                screen.getByRole('list', { name: 'Current step' }),
            ).toHaveTextContent('Change status');
        });

        test('Backspace on an empty input goes back one level', async () => {
            const user = setup([parent, dashboard]);
            open();
            await user.click(screen.getByText('Change status'));

            await user.keyboard('{Backspace}');

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(optionNames()).toContain('Change status');
        });

        test('Backspace with text only deletes a character', async () => {
            const user = setup([parent]);
            open();
            await user.click(screen.getByText('Change status'));

            await user.type(screen.getByRole('combobox'), 'do{Backspace}');

            expect(screen.getByRole('combobox')).toHaveValue('d');
            expect(
                screen.getByRole('list', { name: 'Current step' }),
            ).toBeInTheDocument();
        });

        test('Escape goes back first, and closes on the root page', async () => {
            const user = setup([parent]);
            open();
            await user.click(screen.getByText('Change status'));

            await user.keyboard('{Escape}');
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.queryByRole('list')).not.toBeInTheDocument();

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('running a leaf command of a step performs and closes', async () => {
            const perform = vi.fn();
            const user = setup([
                makeCommand({
                    id: 'issue.status',
                    title: 'Change status',
                    children: () => [
                        makeCommand({ id: 'done', title: 'Done', perform }),
                    ],
                }),
            ]);
            open();

            await user.click(screen.getByText('Change status'));
            await user.click(screen.getByText('Done'));

            expect(perform).toHaveBeenCalledTimes(1);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });

    describe('while open', () => {
        test('registers as an open modal and suspends global shortcuts', () => {
            setup(BASE);
            expect(anyModalOpen()).toBe(false);
            expect(areShortcutsSuspended()).toBe(false);

            open();
            expect(anyModalOpen()).toBe(true);
            expect(areShortcutsSuspended()).toBe(true);

            act(() => palette.closePalette());
            expect(anyModalOpen()).toBe(false);
            expect(areShortcutsSuspended()).toBe(false);
        });

        test('restores focus to the previously focused element on close', async () => {
            const user = setup(BASE);
            const trigger = screen.getByText('trigger');
            trigger.focus();
            expect(trigger).toHaveFocus();

            open();
            expect(screen.getByRole('combobox')).toHaveFocus();

            await user.keyboard('{Escape}');
            expect(trigger).toHaveFocus();
        });

        test('starts from a clean query every time it opens', async () => {
            const user = setup(BASE);
            open();
            await user.type(screen.getByRole('combobox'), 'dark');

            act(() => palette.closePalette());
            open();

            expect(screen.getByRole('combobox')).toHaveValue('');
        });
    });
});
