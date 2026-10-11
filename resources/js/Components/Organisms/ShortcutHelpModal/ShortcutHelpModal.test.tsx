import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ShortcutDefinition } from '@/types/Shortcuts';

const shortcutsHolder = vi.hoisted(() => ({
    shortcuts: [] as ShortcutDefinition[],
}));

vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: () => ({ shortcuts: shortcutsHolder.shortcuts }),
}));

import { ShortcutHelpModal } from './ShortcutHelpModal';

describe('ShortcutHelpModal Component', () => {
    beforeEach(() => {
        // jsdom does not implement scrollIntoView; the component calls it
        // whenever the selected shortcut changes.
        Element.prototype.scrollIntoView = vi.fn();

        shortcutsHolder.shortcuts = [
            {
                key: '?',
                description: 'Show keyboard shortcuts',
                category: 'Action',
                action: vi.fn(),
            },
            {
                key: 'alt+p',
                description: 'Go to Projects',
                category: 'Navigation',
                action: vi.fn(),
            },
            {
                key: 'g i',
                description: 'Go to issues',
                category: 'Navigation',
                action: vi.fn(),
            },
        ];
    });

    test('renders every shortcut grouped by category', () => {
        render(<ShortcutHelpModal />);

        expect(
            screen.getByRole('heading', { name: 'Action' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Navigation' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
        expect(screen.getByText('Go to Projects')).toBeInTheDocument();
        expect(screen.getByText('Go to issues')).toBeInTheDocument();
    });

    test('filters shortcuts by description as the user types', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.type(
            screen.getByPlaceholderText('Search shortcuts...'),
            'issues',
        );

        expect(screen.getByText('Go to issues')).toBeInTheDocument();
        expect(screen.queryByText('Go to Projects')).not.toBeInTheDocument();
        expect(
            screen.queryByText('Show keyboard shortcuts'),
        ).not.toBeInTheDocument();
    });

    test('filters shortcuts by category', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.type(
            screen.getByPlaceholderText('Search shortcuts...'),
            'navigation',
        );

        expect(screen.getByText('Go to Projects')).toBeInTheDocument();
        expect(screen.getByText('Go to issues')).toBeInTheDocument();
        expect(
            screen.queryByText('Show keyboard shortcuts'),
        ).not.toBeInTheDocument();
    });

    test('shows a "no shortcuts found" message when nothing matches', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.type(
            screen.getByPlaceholderText('Search shortcuts...'),
            'nonexistent-shortcut',
        );

        expect(
            screen.getByText(/No shortcuts found for "nonexistent-shortcut"/),
        ).toBeInTheDocument();
    });

    test('is a read-only reference: Enter and arrows never run a shortcut', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        const input = screen.getByPlaceholderText('Search shortcuts...');
        await user.click(input);
        await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');

        shortcutsHolder.shortcuts.forEach((shortcut) => {
            expect(shortcut.action).not.toHaveBeenCalled();
        });
    });

    test('clicking a row does not run its shortcut', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.click(screen.getByText('Go to Projects'));

        expect(shortcutsHolder.shortcuts[1].action).not.toHaveBeenCalled();
    });

    test('shows every binding of an array-key shortcut separated by "or"', () => {
        shortcutsHolder.shortcuts = [
            {
                key: ['c', 'ctrl+i'],
                description: 'Create issue',
                category: 'Creation',
                action: vi.fn(),
            },
        ];
        render(<ShortcutHelpModal />);

        expect(screen.getByText('or')).toBeInTheDocument();
        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.getByText('CTRL')).toBeInTheDocument();
        expect(screen.getByText('I')).toBeInTheDocument();
    });

    test('searches across every binding of an array-key shortcut', async () => {
        const user = userEvent.setup();
        shortcutsHolder.shortcuts = [
            {
                key: ['c', 'ctrl+i'],
                description: 'Create issue',
                category: 'Creation',
                action: vi.fn(),
            },
            {
                key: 'alt+p',
                description: 'Go to Projects',
                category: 'Navigation',
                action: vi.fn(),
            },
        ];
        render(<ShortcutHelpModal />);

        await user.type(
            screen.getByPlaceholderText('Search shortcuts...'),
            'ctrl+i',
        );

        expect(screen.getByText('Create issue')).toBeInTheDocument();
        expect(screen.queryByText('Go to Projects')).not.toBeInTheDocument();
    });

    test('renders mod combos with platform-aware chips', () => {
        vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
        shortcutsHolder.shortcuts = [
            {
                key: 'mod+k',
                description: 'Open command palette',
                category: 'Action',
                action: vi.fn(),
            },
        ];
        render(<ShortcutHelpModal />);

        expect(screen.getByText('⌘')).toBeInTheDocument();
        expect(screen.getByText('K')).toBeInTheDocument();
    });

    test('renders single-key shortcuts and multi-key combo shortcuts', () => {
        render(<ShortcutHelpModal />);

        expect(screen.getByText('then')).toBeInTheDocument();
    });

    test('renders a category icon avatar for each shortcut row', () => {
        const { container } = render(<ShortcutHelpModal />);

        const avatars = container.querySelectorAll(
            'span.rounded-lg.bg-\\[var\\(--bg-light-color\\)\\]',
        );
        expect(avatars.length).toBe(shortcutsHolder.shortcuts.length);
    });

    test('renders an "All" tab plus one tab per category', () => {
        render(<ShortcutHelpModal />);

        expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(
            screen.getByRole('button', { name: 'Action' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Navigation' }),
        ).toBeInTheDocument();
    });

    test('filters to a single category when its tab is clicked', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.click(screen.getByRole('button', { name: 'Navigation' }));

        expect(
            screen.getByRole('button', { name: 'Navigation' }),
        ).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Go to Projects')).toBeInTheDocument();
        expect(screen.getByText('Go to issues')).toBeInTheDocument();
        expect(
            screen.queryByText('Show keyboard shortcuts'),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('heading', { name: 'Action' }),
        ).not.toBeInTheDocument();
    });

    test('clicking "All" clears the active category filter', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.click(screen.getByRole('button', { name: 'Navigation' }));
        await user.click(screen.getByRole('button', { name: 'All' }));

        expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
        expect(screen.getByText('Go to Projects')).toBeInTheDocument();
    });

    test('combines the category filter with the search query', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        await user.click(screen.getByRole('button', { name: 'Navigation' }));
        await user.type(
            screen.getByPlaceholderText('Search shortcuts...'),
            'issues',
        );

        expect(screen.getByText('Go to issues')).toBeInTheDocument();
        expect(screen.queryByText('Go to Projects')).not.toBeInTheDocument();
    });

    test('does not render a border on the modal shell, header, or footer', () => {
        const { container } = render(<ShortcutHelpModal />);

        const shell = container.querySelector('.shortcut-modal-marker');
        expect(shell?.className).not.toMatch(/border-\[var\(--border-color/);

        container
            .querySelectorAll(':scope > .shortcut-modal-marker > div')
            .forEach((section) => {
                expect(section.className).not.toMatch(
                    /border-\[var\(--border-color/,
                );
            });
    });
});
