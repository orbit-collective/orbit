import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { DropdownOptionItem, DropdownProps } from '@/types/Dropdown';
import Dropdown from './Dropdown';

const options: DropdownOptionItem[] = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
];

const manyOptions: DropdownOptionItem[] = Array.from(
    { length: 8 },
    (_, index) => ({ value: `v${index}`, label: `Item ${index}` }),
);

const setup = (props: Partial<DropdownProps> = {}) => {
    const onSelect = vi.fn();
    const utils = render(
        <Dropdown
            trigger={<button>Open</button>}
            options={options}
            onSelect={onSelect}
            {...props}
        />,
    );

    return { onSelect, ...utils };
};

describe('Dropdown', () => {
    test('stays closed until the trigger is clicked and exposes aria state', async () => {
        setup();
        const trigger = screen.getByRole('button', { name: 'Open' });

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(trigger);

        expect(screen.getByRole('listbox')).toBeInTheDocument();
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    });

    test('a function trigger receives the open state', async () => {
        setup({
            trigger: ({ isOpen }) => (
                <button>{isOpen ? 'Close me' : 'Open me'}</button>
            ),
        });

        await userEvent.click(screen.getByText('Open me'));

        expect(screen.getByText('Close me')).toBeInTheDocument();
    });

    test('select: picking an option reports it, closes and restores focus', async () => {
        const { onSelect } = setup({ selectedValues: ['a'] });
        await userEvent.click(screen.getByText('Open'));

        expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute(
            'aria-selected',
            'true',
        );

        await userEvent.click(screen.getByRole('option', { name: 'Beta' }));

        expect(onSelect).toHaveBeenCalledWith('b', options[1]);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(screen.getByText('Open')).toHaveFocus();
    });

    test('multiselect: stays open between picks and is flagged multiselectable', async () => {
        const { onSelect } = setup({ variant: 'multiselect' });
        await userEvent.click(screen.getByText('Open'));

        await userEvent.click(screen.getByRole('option', { name: 'Alpha' }));
        await userEvent.click(screen.getByRole('option', { name: 'Beta' }));

        expect(onSelect).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('listbox')).toHaveAttribute(
            'aria-multiselectable',
            'true',
        );
    });

    test('menu: renders actions as menu items with tones and closes after a pick', async () => {
        const { onSelect } = setup({
            variant: 'menu',
            options: [
                { value: 'settings', label: 'Settings' },
                { value: 'logout', label: 'Log out', tone: 'danger' },
            ],
        });
        await userEvent.click(screen.getByText('Open'));

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'Log out' })).toHaveClass(
            'text-red-400',
        );

        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Settings' }),
        );

        expect(onSelect).toHaveBeenCalledWith('settings', expect.anything());
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('per-option role and indicator overrides drive mixed menus', async () => {
        setup({
            variant: 'menu',
            options: [
                {
                    value: 'r',
                    label: 'Radio',
                    role: 'menuitemradio',
                    indicator: 'check',
                },
                {
                    value: 'c',
                    label: 'Check',
                    role: 'menuitemcheckbox',
                    indicator: 'check',
                },
            ],
            selectedValues: ['r'],
        });
        await userEvent.click(screen.getByText('Open'));

        expect(screen.getByRole('menuitemradio')).toHaveAttribute(
            'aria-checked',
            'true',
        );
        expect(screen.getByRole('menuitemcheckbox')).toHaveAttribute(
            'aria-checked',
            'false',
        );
    });

    test('clicks inside the panel do not reach clickable ancestors', async () => {
        const onAncestorClick = vi.fn();
        render(
            <div onClick={onAncestorClick}>
                <Dropdown trigger={<button>Open</button>} options={options} />
            </div>,
        );
        await userEvent.click(screen.getByText('Open'));
        onAncestorClick.mockClear();

        await userEvent.click(screen.getByRole('option', { name: 'Alpha' }));

        expect(onAncestorClick).not.toHaveBeenCalled();
    });

    test('key presses inside the panel do not reach ancestors, but Escape still closes it', async () => {
        const onAncestorKeyDown = vi.fn();
        render(
            <div onKeyDown={onAncestorKeyDown}>
                <Dropdown trigger={<button>Open</button>} options={options} />
            </div>,
        );
        await userEvent.click(screen.getByText('Open'));
        onAncestorKeyDown.mockClear();

        await userEvent.keyboard('{ArrowDown}{Enter}');
        expect(onAncestorKeyDown).not.toHaveBeenCalled();

        await userEvent.click(screen.getByText('Open'));
        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('does not select disabled options', async () => {
        const { onSelect } = setup({
            options: [{ value: 'x', label: 'Locked', disabled: true }],
        });
        await userEvent.click(screen.getByText('Open'));
        await userEvent.click(screen.getByRole('option', { name: 'Locked' }));

        expect(onSelect).not.toHaveBeenCalled();
    });

    test('renders separators and headings as structure, not options', async () => {
        setup({
            variant: 'menu',
            options: [
                { value: 'h', label: 'Role', kind: 'heading' },
                { value: 'a', label: 'Alpha' },
                { value: 's', label: '', kind: 'separator' },
                { value: 'b', label: 'Beta' },
            ],
        });
        await userEvent.click(screen.getByText('Open'));

        expect(screen.getByText('Role')).toBeInTheDocument();
        expect(screen.getByRole('separator')).toBeInTheDocument();
        expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    });

    describe('search', () => {
        test('appears automatically for long lists and filters them', async () => {
            setup({ options: manyOptions, searchPlaceholder: 'Search items…' });
            await userEvent.click(screen.getByText('Open'));

            await userEvent.type(
                screen.getByPlaceholderText('Search items…'),
                '3',
            );

            expect(screen.getAllByRole('option')).toHaveLength(1);
            expect(
                screen.getByRole('option', { name: 'Item 3' }),
            ).toBeInTheDocument();
        });

        test('is absent for short lists and can be forced on', async () => {
            const { unmount } = setup();
            await userEvent.click(screen.getByText('Open'));
            expect(
                screen.queryByPlaceholderText('Search…'),
            ).not.toBeInTheDocument();
            unmount();

            setup({ searchable: true });
            await userEvent.click(screen.getByText('Open'));
            expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument();
        });

        test('shows the empty message when nothing matches', async () => {
            setup({ options: manyOptions, emptyMessage: 'Nothing here' });
            await userEvent.click(screen.getByText('Open'));
            await userEvent.type(screen.getByPlaceholderText('Search…'), 'zzz');

            expect(screen.getByText('Nothing here')).toBeInTheDocument();
        });

        test('matches rich labels through searchLabel', async () => {
            setup({
                searchable: true,
                options: [
                    {
                        value: 'x',
                        label: <b>Ada</b>,
                        searchLabel: 'Ada Lovelace',
                    },
                    { value: 'y', label: <b>Bob</b>, searchLabel: 'Bob Ross' },
                ],
            });
            await userEvent.click(screen.getByText('Open'));
            await userEvent.type(
                screen.getByPlaceholderText('Search…'),
                'love',
            );

            expect(screen.getAllByRole('option')).toHaveLength(1);
        });
    });

    describe('header actions', () => {
        test('shows the title and a Clear action only while something is selected', async () => {
            const onClear = vi.fn();
            const { unmount } = setup({ title: 'Status', onClear });
            await userEvent.click(screen.getByText('Open'));
            expect(screen.getByText('Status')).toBeInTheDocument();
            expect(screen.queryByText('Clear')).not.toBeInTheDocument();
            unmount();

            setup({ title: 'Status', onClear, selectedValues: ['a'] });
            await userEvent.click(screen.getByText('Open'));
            await userEvent.click(screen.getByText('Clear'));

            expect(onClear).toHaveBeenCalledOnce();
        });

        test('shows the result count', async () => {
            setup({ showCount: true });
            await userEvent.click(screen.getByText('Open'));

            expect(screen.getByText('3 results')).toBeInTheDocument();
        });

        test('multiselect "Select all" toggles every enabled option', async () => {
            const onSelectAll = vi.fn();
            setup({ variant: 'multiselect', onSelectAll });
            await userEvent.click(screen.getByText('Open'));
            await userEvent.click(screen.getByText('Select all'));

            expect(onSelectAll).toHaveBeenCalledOnce();
        });

        test('single select never offers "Select all"', async () => {
            setup({ onSelectAll: vi.fn() });
            await userEvent.click(screen.getByText('Open'));

            expect(screen.queryByText('Select all')).not.toBeInTheDocument();
        });
    });

    describe('panel variant', () => {
        test('renders custom content and hands it a close callback', async () => {
            setup({
                variant: 'panel',
                ariaLabel: 'Saved views',
                children: ({ close }) => <button onClick={close}>Done</button>,
            });
            await userEvent.click(screen.getByText('Open'));

            const dialog = screen.getByRole('dialog', { name: 'Saved views' });
            await userEvent.click(within(dialog).getByText('Done'));

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('does not close on Tab, so forms inside keep working', async () => {
            setup({
                variant: 'panel',
                children: <input aria-label="Name" />,
            });
            await userEvent.click(screen.getByText('Open'));
            await userEvent.tab();

            expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
    });

    describe('keyboard and dismissal', () => {
        test('ArrowDown on the trigger opens it and focuses the first option', async () => {
            setup();
            screen.getByText('Open').focus();
            await userEvent.keyboard('{ArrowDown}');

            expect(screen.getByRole('option', { name: 'Alpha' })).toHaveFocus();
        });

        test('focuses the selected option on open and moves with arrows', async () => {
            setup({ selectedValues: ['b'] });
            await userEvent.click(screen.getByText('Open'));

            expect(screen.getByRole('option', { name: 'Beta' })).toHaveFocus();

            await userEvent.keyboard('{ArrowDown}');
            expect(screen.getByRole('option', { name: 'Gamma' })).toHaveFocus();
            await userEvent.keyboard('{ArrowDown}');
            expect(screen.getByRole('option', { name: 'Alpha' })).toHaveFocus();
            await userEvent.keyboard('{End}');
            expect(screen.getByRole('option', { name: 'Gamma' })).toHaveFocus();
        });

        test('Escape closes and returns focus to the trigger', async () => {
            setup();
            await userEvent.click(screen.getByText('Open'));
            await userEvent.keyboard('{Escape}');

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
            expect(screen.getByText('Open')).toHaveFocus();
        });

        test('Tab closes the list and lets focus move on from the trigger', async () => {
            setup();
            await userEvent.click(screen.getByText('Open'));
            await userEvent.keyboard('{Tab}');

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        });

        test('clicking outside closes it', async () => {
            setup();
            await userEvent.click(screen.getByText('Open'));
            await userEvent.click(document.body);

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        });

        test('a disabled dropdown does not open', async () => {
            setup({ disabled: true });
            await userEvent.click(screen.getByText('Open'));

            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        });
    });

    describe('controlled state', () => {
        test('follows `open` and reports changes through onOpenChange', async () => {
            const onOpenChange = vi.fn();
            const { rerender } = setup({ open: false, onOpenChange });

            await userEvent.click(screen.getByText('Open'));
            expect(onOpenChange).toHaveBeenCalledWith(true);
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

            rerender(
                <Dropdown
                    trigger={<button>Open</button>}
                    options={options}
                    open
                    onOpenChange={onOpenChange}
                />,
            );
            expect(screen.getByRole('listbox')).toBeInTheDocument();
        });
    });
});

describe('Dropdown submenu', () => {
    const menuOptions: DropdownOptionItem[] = [
        { value: 'settings', label: 'Settings' },
        {
            value: 'languages',
            label: 'Languages',
            children: [
                {
                    value: 'en',
                    label: 'English',
                    role: 'menuitemradio',
                    indicator: 'check',
                },
                {
                    value: 'pl',
                    label: 'Polski',
                    role: 'menuitemradio',
                    indicator: 'check',
                },
            ],
        },
    ];

    const setupMenu = (props: Partial<DropdownProps> = {}) =>
        setup({
            variant: 'menu',
            options: menuOptions,
            selectedValues: ['pl'],
            ...props,
        });

    test('marks the parent row as a menu popup and keeps the flyout closed', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));

        const parent = screen.getByRole('menuitem', { name: 'Languages' });
        expect(parent).toHaveAttribute('aria-haspopup', 'menu');
        expect(parent).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
    });

    test('opens on click, exposing radio items and the current one', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const parent = screen.getByRole('menuitem', { name: 'Languages' });

        await userEvent.click(parent);

        expect(parent).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getAllByRole('menu')).toHaveLength(2);
        expect(
            screen.getByRole('menuitemradio', { name: 'Polski' }),
        ).toHaveAttribute('aria-checked', 'true');
        expect(
            screen.getByRole('menuitemradio', { name: 'English' }),
        ).toHaveAttribute('aria-checked', 'false');
    });

    test('clicking the row again closes the flyout', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const parent = screen.getByRole('menuitem', { name: 'Languages' });

        await userEvent.click(parent);
        expect(parent).toHaveAttribute('aria-expanded', 'true');

        await userEvent.click(parent);
        expect(parent).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
    });

    test('hovering the row does not open the flyout', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));

        await userEvent.hover(
            screen.getByRole('menuitem', { name: 'Languages' }),
        );

        expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
    });

    test('the flyout is placed before it is shown (never hidden, never at 0,0)', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Languages' }),
        );

        const flyout = screen.getAllByRole('menu')[1];
        expect(flyout.style.visibility).not.toBe('hidden');
        expect(flyout.style.left).not.toBe('');
    });

    test('picking a child reports it and closes the whole menu', async () => {
        const { onSelect } = setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Languages' }),
        );

        await userEvent.click(
            screen.getByRole('menuitemradio', { name: 'English' }),
        );

        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(
            'en',
            expect.objectContaining({ value: 'en' }),
        );
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('a pointer press inside the flyout does not close the menu', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Languages' }),
        );

        fireEvent.mouseDown(
            screen.getByRole('menuitemradio', { name: 'English' }),
        );

        expect(screen.getAllByRole('menu')).toHaveLength(2);
    });

    test('ArrowRight opens the flyout and focuses the current item; ArrowDown moves within it', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        screen.getByRole('menuitem', { name: 'Languages' }).focus();

        await userEvent.keyboard('{ArrowRight}');

        expect(
            screen.getByRole('menuitemradio', { name: 'Polski' }),
        ).toHaveFocus();

        await userEvent.keyboard('{ArrowDown}');
        expect(
            screen.getByRole('menuitemradio', { name: 'English' }),
        ).toHaveFocus();
    });

    test('ArrowRight moves focus into a flyout that a click already opened', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const parent = screen.getByRole('menuitem', { name: 'Languages' });

        await userEvent.click(parent);
        expect(
            screen.getByRole('menuitemradio', { name: 'Polski' }),
        ).not.toHaveFocus();

        parent.focus();
        await userEvent.keyboard('{ArrowRight}');

        expect(
            screen.getByRole('menuitemradio', { name: 'Polski' }),
        ).toHaveFocus();
    });

    test('Enter on the parent row opens the flyout with focus inside', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        screen.getByRole('menuitem', { name: 'Languages' }).focus();

        await userEvent.keyboard('{Enter}');

        expect(
            screen.getByRole('menuitemradio', { name: 'Polski' }),
        ).toHaveFocus();
    });

    test('ArrowLeft and Escape close only the flyout and return focus to its row', async () => {
        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        const parent = screen.getByRole('menuitem', { name: 'Languages' });
        parent.focus();

        await userEvent.keyboard('{ArrowRight}{ArrowLeft}');
        expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
        expect(parent).toHaveFocus();

        await userEvent.keyboard('{ArrowRight}{Escape}');
        expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(parent).toHaveFocus();

        await userEvent.keyboard('{Escape}');
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('flips to the left of the menu when there is no room on the right', async () => {
        Object.defineProperty(window, 'innerWidth', {
            configurable: true,
            value: 1024,
        });
        const rect = (left: number, right: number) =>
            ({
                left,
                right,
                top: 100,
                bottom: 130,
                width: right - left,
                height: 30,
                x: left,
                y: 100,
                toJSON: () => ({}),
            }) as DOMRect;
        const spy = vi
            .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
            .mockImplementation(() => rect(800, 1000));

        setupMenu();
        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        await userEvent.click(
            screen.getByRole('menuitem', { name: 'Languages' }),
        );

        const flyout = screen.getAllByRole('menu')[1];
        // 800 (menu left) - 208 (flyout width) - 2 (gap)
        expect(flyout.style.left).toBe('590px');

        spy.mockRestore();
    });
});
