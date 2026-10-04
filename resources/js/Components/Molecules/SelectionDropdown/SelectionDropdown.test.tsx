import { SelectionDropdownProps } from '@/types/Components';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SelectionDropdown from './SelectionDropdown';

const mockGetIfAnyModalIsOpened = vi.hoisted(() => vi.fn(() => false));
const mockUseShortcuts = vi.hoisted(() => vi.fn());

vi.mock('@/context/ModalContext', () => ({
    useModal: () => ({ getIfAnyModalIsOpened: mockGetIfAnyModalIsOpened }),
}));

vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: mockUseShortcuts,
}));

const baseOptions: SelectionDropdownProps['options'] = [
    { label: 'Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Priority', value: 'priority', disabled: true },
];

describe('SelectionDropdown Component', () => {
    beforeEach(() => {
        mockGetIfAnyModalIsOpened.mockReturnValue(false);
        mockUseShortcuts.mockClear();
    });

    test('renders the trigger and keeps the dropdown closed by default', () => {
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        expect(screen.getByText('Columns')).toBeInTheDocument();
        expect(screen.queryByText('Display Columns')).not.toBeInTheDocument();
    });

    test('opens the dropdown when the trigger is clicked', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));

        expect(await screen.findByText('Display Columns')).toBeInTheDocument();
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    test('closes the dropdown when the trigger is clicked again', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        expect(await screen.findByText('Display Columns')).toBeInTheDocument();

        await user.click(screen.getByText('Columns'));
        expect(screen.queryByText('Display Columns')).not.toBeInTheDocument();
    });

    test('calls onChange with the option value when an enabled option is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={onChange}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await user.click(await screen.findByText('Title'));

        expect(onChange).toHaveBeenCalledWith('title');
    });

    test('does not call onChange when a disabled option is clicked', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={onChange}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await user.click(await screen.findByText('Priority'));

        expect(onChange).not.toHaveBeenCalled();
    });

    test('renders a checkmark for selected options', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={['title']}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByText('Display Columns');

        expect(document.querySelector('.lucide-check')).toBeInTheDocument();
    });

    test('renders no checkmarks when nothing is selected', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByText('Display Columns');

        expect(document.querySelectorAll('.lucide-check')).toHaveLength(0);
    });

    test('renders a checkmark for every option when all are selected', async () => {
        const user = userEvent.setup();
        const options: SelectionDropdownProps['options'] = [
            { label: 'Title', value: 'title' },
            { label: 'Status', value: 'status' },
        ];
        render(
            <SelectionDropdown
                options={options}
                selectedValues={['title', 'status']}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByText('Display Columns');

        expect(document.querySelectorAll('.lucide-check')).toHaveLength(2);
    });

    test('renders a divider instead of a button for separator options', async () => {
        const user = userEvent.setup();
        const options: SelectionDropdownProps['options'] = [
            { label: 'Title', value: 'title' },
            { label: '', value: 'separator', kind: 'separator' },
            { label: 'Status', value: 'status' },
        ];
        render(
            <SelectionDropdown
                options={options}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByText('Display Columns');

        expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(2);
        expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    test('renders the header with no option buttons when the list is empty', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={[]}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));

        expect(await screen.findByText('Display Columns')).toBeInTheDocument();
        expect(screen.queryAllByRole('menuitemcheckbox')).toHaveLength(0);
    });

    test('closes the dropdown when clicking outside', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByText('Display Columns');

        await user.click(document.body);

        expect(screen.queryByText('Display Columns')).not.toBeInTheDocument();
    });

    test('the alt+s shortcut opens the dropdown when no modal is open', () => {
        mockGetIfAnyModalIsOpened.mockReturnValue(false);
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        const shortcuts = mockUseShortcuts.mock.calls.at(-1)?.[0];
        const shortcut = shortcuts.find(
            (s: { key: string }) => s.key === 'alt+s',
        );

        act(() => {
            shortcut.action();
        });

        expect(screen.getByText('Display Columns')).toBeInTheDocument();
    });

    test('the alt+s shortcut does nothing when a modal is already open', () => {
        mockGetIfAnyModalIsOpened.mockReturnValue(true);
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        const shortcuts = mockUseShortcuts.mock.calls.at(-1)?.[0];
        const shortcut = shortcuts.find(
            (s: { key: string }) => s.key === 'alt+s',
        );

        act(() => {
            shortcut.action();
        });

        expect(screen.queryByText('Display Columns')).not.toBeInTheDocument();
    });

    test('removes the scroll listener it added when it closes', async () => {
        const user = userEvent.setup();
        const add = vi.spyOn(window, 'addEventListener');
        const remove = vi.spyOn(window, 'removeEventListener');
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<button>Columns</button>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByRole('menu');
        await user.click(document.body);

        const added = add.mock.calls.find(([type]) => type === 'scroll');
        const removed = remove.mock.calls.find(([type]) => type === 'scroll');
        expect(added).toBeDefined();
        expect(removed?.[1]).toBe(added?.[1]);

        add.mockRestore();
        remove.mockRestore();
    });

    test('closes when the page scrolls', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<button>Columns</button>}
            />,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByRole('menu');

        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('moves focus into the menu, supports arrow keys, and returns focus on Escape', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={['title']}
                onChange={vi.fn()}
                trigger={<button>Columns</button>}
            />,
        );

        const trigger = screen.getByText('Columns');
        await user.click(trigger);

        const title = await screen.findByRole('menuitemcheckbox', {
            name: 'Title',
        });
        expect(title).toHaveFocus();
        expect(title).toHaveAttribute('aria-checked', 'true');

        await user.keyboard('{ArrowDown}');
        expect(
            screen.getByRole('menuitemcheckbox', { name: 'Status' }),
        ).toHaveFocus();

        // Disabled options are skipped, so the list wraps back to the start.
        await user.keyboard('{ArrowDown}');
        expect(title).toHaveFocus();

        await user.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(trigger).toHaveFocus();
    });

    test('Tab closes the menu and moves on past the trigger', async () => {
        const user = userEvent.setup();
        render(
            <>
                <SelectionDropdown
                    options={baseOptions}
                    selectedValues={[]}
                    onChange={vi.fn()}
                    trigger={<button>Columns</button>}
                />
                <button>Next</button>
            </>,
        );

        await user.click(screen.getByText('Columns'));
        await screen.findByRole('menuitemcheckbox', { name: 'Title' });

        await user.tab();
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
        expect(screen.getByText('Next')).toHaveFocus();
    });

    test('exposes the open state on the trigger element', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<button>Columns</button>}
            />,
        );

        const trigger = screen.getByRole('button', { name: 'Columns' });
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    test('derives item roles and the checkbox indicator from the option kind', async () => {
        const user = userEvent.setup();
        const options: SelectionDropdownProps['options'] = [
            { label: 'Reset', value: 'reset', kind: 'action' },
            { label: 'Compact', value: 'compact', kind: 'radio' },
            { label: 'Title', value: 'title' },
        ];
        render(
            <SelectionDropdown
                options={options}
                selectedValues={['compact']}
                onChange={vi.fn()}
                trigger={<span>Columns</span>}
            />,
        );

        await user.click(screen.getByText('Columns'));

        expect(
            screen.getByRole('menuitem', { name: 'Reset' }),
        ).not.toHaveAttribute('aria-checked');
        expect(
            screen.getByRole('menuitemradio', { name: 'Compact' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
            screen.getByRole('menuitemcheckbox', { name: 'Title' }),
        ).toHaveAttribute('aria-checked', 'false');
        // Only the checkbox-kind option renders the checkbox indicator box.
        expect(
            document.querySelectorAll('.h-4.w-4.rounded.border'),
        ).toHaveLength(1);
    });

    test('keeps the menu inside the viewport when the trigger is near the left edge', async () => {
        const user = userEvent.setup();
        render(
            <SelectionDropdown
                options={baseOptions}
                selectedValues={[]}
                onChange={vi.fn()}
                trigger={<button>Columns</button>}
            />,
        );

        // jsdom reports a zero rect (right = 0), i.e. the left edge.
        await user.click(screen.getByText('Columns'));

        expect(screen.getByRole('menu').style.left).toBe('8px');
    });
});
