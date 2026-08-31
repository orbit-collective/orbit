import { ShortcutDefinition } from '@/types/Shortcuts';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockCloseAllModals = vi.hoisted(() => vi.fn());
const shortcutsHolder = vi.hoisted(() => ({
    shortcuts: [] as ShortcutDefinition[],
}));

vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: () => ({ shortcuts: shortcutsHolder.shortcuts }),
}));

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({ closeAllModals: mockCloseAllModals }),
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

        expect(screen.getByText('Action')).toBeInTheDocument();
        expect(screen.getByText('Navigation')).toBeInTheDocument();
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

    test('pressing Enter without navigating triggers the first shortcut and closes all modals', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        const input = screen.getByPlaceholderText('Search shortcuts...');
        await user.click(input);
        await user.keyboard('{Enter}');

        expect(shortcutsHolder.shortcuts[0].action).toHaveBeenCalledTimes(1);
        expect(mockCloseAllModals).toHaveBeenCalledTimes(1);
    });

    test('ArrowDown moves the selection to the next shortcut before Enter triggers it', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        const input = screen.getByPlaceholderText('Search shortcuts...');
        await user.click(input);
        await user.keyboard('{ArrowDown}');
        await user.keyboard('{Enter}');

        expect(shortcutsHolder.shortcuts[1].action).toHaveBeenCalledTimes(1);
        expect(shortcutsHolder.shortcuts[0].action).not.toHaveBeenCalled();
    });

    test('ArrowDown does not move past the last shortcut', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        const input = screen.getByPlaceholderText('Search shortcuts...');
        await user.click(input);
        await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}');
        await user.keyboard('{Enter}');

        expect(shortcutsHolder.shortcuts[2].action).toHaveBeenCalledTimes(1);
    });

    test('ArrowUp moves the selection back up and does not go below the first shortcut', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        const input = screen.getByPlaceholderText('Search shortcuts...');
        await user.click(input);
        await user.keyboard('{ArrowDown}{ArrowUp}{ArrowUp}{ArrowUp}');
        await user.keyboard('{Enter}');

        expect(shortcutsHolder.shortcuts[0].action).toHaveBeenCalledTimes(1);
    });

    test('typing a search query resets the selection back to the first match', async () => {
        const user = userEvent.setup();
        render(<ShortcutHelpModal />);

        const input = screen.getByPlaceholderText('Search shortcuts...');
        await user.click(input);
        await user.keyboard('{ArrowDown}{ArrowDown}');
        await user.type(input, 'navigation');
        await user.keyboard('{Enter}');

        expect(shortcutsHolder.shortcuts[1].action).toHaveBeenCalledTimes(1);
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
