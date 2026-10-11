import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { issues } from '@/stories/fixtures';
import { ListRow } from './ListRow';

const meta = {
    title: 'Organisms/ListRow',
    component: ListRow,
    args: {
        issue: issues[0],
        isClosed: false,
        onClick: fn(),
        onRemove: fn(),
        handleSelectIssueCheckbox: fn(),
        onToggleCollapse: fn(),
    },
    decorators: [
        (Story) => (
            <div className="overflow-x-auto bg-[var(--bg-color)]">
                <table className="w-full border-separate border-spacing-0 text-left text-xs">
                    <tbody>
                        <Story />
                    </tbody>
                </table>
            </div>
        ),
    ],
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(within(canvasElement).getByText(issues[0].title));
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};

export const Closed: Story = {
    args: { issue: issues[4], isClosed: true },
};

export const Unassigned: Story = {
    args: { issue: issues[1] },
};

export const Selected: Story = {
    args: { issue: { ...issues[0], isChecked: true } },
};

/** A parent row with a collapse toggle, followed by its indented child. */
export const WithChildren: Story = {
    args: { hasChildren: true },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: 'Collapse sub-issues',
            }),
        );
        await expect(args.onToggleCollapse).toHaveBeenCalledTimes(1);
    },
};

export const Nested: Story = {
    args: { issue: issues[3], depth: 2 },
};

export const Collapsed: Story = {
    args: { hasChildren: true, isCollapsed: true },
};

export const CompactRowWithFewColumns: Story = {
    args: {
        rowHeight: 32,
        enabledColumns: { id: true, title: true, status: true },
    },
};
