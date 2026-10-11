import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import {
    DEFAULT_COLUMN_WIDTHS,
    DEFAULT_ENABLED_COLUMNS,
    ISSUE_TABLE_COLUMNS,
} from '@/utils/issueTableColumns';
import { IssueTableHead } from './IssueTableHead';

const headers = ISSUE_TABLE_COLUMNS.filter(
    (column) => DEFAULT_ENABLED_COLUMNS[column.value],
).map((column) => ({ label: column.label, value: column.value }));

const meta = {
    title: 'Organisms/IssueTableHead',
    component: IssueTableHead,
    args: {
        headers,
        resolvedColumnWidths: DEFAULT_COLUMN_WIDTHS,
        isAllSelected: false,
        isResizing: null,
        isResizingHeight: false,
        hasQueryParams: true,
        enabledColumns: DEFAULT_ENABLED_COLUMNS,
        rowHeight: 44,
        onSelectAll: fn(),
        onSort: fn(),
        onMouseDown: fn(),
        onDoubleClick: fn(),
        onHeightMouseDown: fn(),
        onColumnToggle: fn(),
    },
    decorators: [
        (Story) => (
            <div className="overflow-x-auto bg-[var(--bg-color)]">
                <table className="w-full table-fixed border-separate border-spacing-0 text-left text-xs">
                    <Story />
                </table>
            </div>
        ),
    ],
} satisfies Meta<typeof IssueTableHead>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SortedAscending: Story = {
    args: { currentSort: 'title', currentDirection: 'AZ' },
};

export const SortedDescending: Story = {
    args: { currentSort: 'priority', currentDirection: 'ZA' },
};

export const AllSelected: Story = {
    args: { isAllSelected: true },
};

export const SortingDisabled: Story = {
    args: { hasQueryParams: false },
};

export const SelectAllInteraction: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole('checkbox'));
        await expect(args.onSelectAll).toHaveBeenCalledTimes(1);
    },
};
