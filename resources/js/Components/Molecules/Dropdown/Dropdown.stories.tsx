import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, userEvent, within } from 'storybook/test';
import Button from '@/Components/Atoms/Button/Button';
import type { DropdownOptionItem } from '@/types/Dropdown';
import Dropdown from './Dropdown';

const statusOptions: DropdownOptionItem[] = [
    { value: 'open', label: 'Open', icon: 'CircleDot' },
    { value: 'in_progress', label: 'In progress', icon: 'CircleDashed' },
    { value: 'closed', label: 'Closed', icon: 'CircleCheck' },
];

const manyOptions: DropdownOptionItem[] = Array.from(
    { length: 10 },
    (_, index) => ({ value: `opt-${index}`, label: `Option ${index + 1}` }),
);

const meta = {
    title: 'Molecules/Dropdown',
    component: Dropdown,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex h-[360px] w-[320px] items-start justify-center">
                <Story />
            </div>
        ),
    ],
    args: {
        open: true,
        onOpenChange: fn(),
        onSelect: fn(),
        options: statusOptions,
        selectedValues: ['open'],
        title: 'Status',
        trigger: <Button variant="default">Status</Button>,
    },
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Select: Story = {
    args: { variant: 'select' },
    play: async ({ args }) => {
        await userEvent.click(
            await screen.findByRole('option', { name: /in progress/i }),
        );
        await expect(args.onSelect).toHaveBeenCalledWith(
            'in_progress',
            expect.anything(),
        );
    },
};

export const Multiselect: Story = {
    args: {
        variant: 'multiselect',
        selectedValues: ['open', 'closed'],
        showCount: true,
        onClear: fn(),
        onSelectAll: fn(),
    },
};

export const Menu: Story = {
    args: {
        variant: 'menu',
        title: undefined,
        selectedValues: [],
        options: [
            { value: 'edit', label: 'Edit', icon: 'Pencil' },
            { value: 'copy', label: 'Copy link', icon: 'Link' },
            { value: 'sep', label: '', kind: 'separator' },
            { value: 'delete', label: 'Delete', icon: 'Trash', tone: 'danger' },
        ],
    },
};

/**
 * A row with `children` becomes a submenu: a chevron on the row, and the
 * children open in a flyout beside the menu (click, Enter, ArrowRight).
 */
export const Submenu: Story = {
    args: {
        variant: 'menu',
        title: undefined,
        selectedValues: ['pl'],
        options: [
            { value: 'settings', label: 'Settings', icon: 'Settings' },
            {
                value: 'languages',
                label: 'Languages',
                icon: 'Languages',
                children: [
                    {
                        value: 'en',
                        label: 'English',
                        trailing: 'EN',
                        role: 'menuitemradio',
                        indicator: 'check',
                    },
                    {
                        value: 'pl',
                        label: 'Polski',
                        trailing: 'PL',
                        role: 'menuitemradio',
                        indicator: 'check',
                    },
                ],
            },
        ],
    },
    play: async ({ args }) => {
        const parent = await screen.findByRole('menuitem', {
            name: /languages/i,
        });
        await expect(parent).toHaveAttribute('aria-haspopup', 'menu');

        await userEvent.click(parent);
        await expect(
            await screen.findByRole('menuitemradio', { name: /polski/i }),
        ).toHaveAttribute('aria-checked', 'true');

        await userEvent.click(
            screen.getByRole('menuitemradio', { name: /english/i }),
        );
        await expect(args.onSelect).toHaveBeenCalledWith(
            'en',
            expect.anything(),
        );
    },
};

/** Long lists get a search box automatically. */
export const Searchable: Story = {
    args: {
        options: manyOptions,
        selectedValues: [],
        searchPlaceholder: 'Search options...',
    },
    play: async () => {
        const search = await screen.findByPlaceholderText('Search options...');
        await userEvent.type(search, 'Option 10');
        await expect(
            await screen.findByRole('option', { name: /option 10/i }),
        ).toBeVisible();
    },
};

export const NoMatches: Story = {
    args: { options: [], emptyMessage: 'Nothing to show.' },
    play: async () => {
        await expect(await screen.findByText('Nothing to show.')).toBeVisible();
    },
};

/** `panel` renders any content inside the floating surface. */
export const Panel: Story = {
    args: {
        variant: 'panel',
        options: [],
        children: (
            <p className="p-3 text-sm text-(--text-color)">
                Any custom content goes here.
            </p>
        ),
    },
};

/** Closed, uncontrolled: the trigger opens it. */
export const Closed: Story = {
    args: { open: undefined },
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: 'Status' }),
        );
        await expect(
            await screen.findByRole('option', { name: /closed/i }),
        ).toBeVisible();
    },
};
