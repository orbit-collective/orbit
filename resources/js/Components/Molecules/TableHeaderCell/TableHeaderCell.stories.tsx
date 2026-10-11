import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import TableHeaderCell from './TableHeaderCell';

const meta = {
    title: 'Molecules/TableHeaderCell',
    component: TableHeaderCell,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <table className="border-collapse">
                <thead>
                    <tr>
                        <Story />
                    </tr>
                </thead>
            </table>
        ),
    ],
    args: {
        column: 'title',
        label: 'Title',
        width: 220,
        isResizing: false,
        canSort: true,
        onSort: fn(),
        onMouseDown: fn(),
        onDoubleClick: fn(),
    },
} satisfies Meta<typeof TableHeaderCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sortable: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText('Title'));
        await expect(args.onSort).toHaveBeenCalledWith('title');
    },
};

export const SortedAscending: Story = {
    args: { currentSort: 'title', currentDirection: 'AZ' },
};

export const SortedDescending: Story = {
    args: { currentSort: 'title', currentDirection: 'ZA' },
};

/** Columns that cannot be sorted ignore clicks and show no arrow. */
export const NotSortable: Story = {
    args: { canSort: false, label: 'Labels', column: 'labels' },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText('Labels'));
        await expect(args.onSort).not.toHaveBeenCalled();
    },
};

export const Resizing: Story = {
    args: { isResizing: true },
};
