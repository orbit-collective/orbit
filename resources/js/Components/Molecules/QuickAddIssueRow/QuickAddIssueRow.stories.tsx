import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { issueTypes } from '@/stories/fixtures';
import QuickAddIssueRow from './QuickAddIssueRow';

const allColumns = {
    id: true,
    title: true,
    type: true,
    status: true,
    assignee: true,
    priority: true,
    labels: true,
    updated: true,
};

const meta = {
    title: 'Molecules/QuickAddIssueRow',
    component: QuickAddIssueRow,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <table className="w-full table-fixed border-collapse">
                <tbody>
                    <Story />
                </tbody>
            </table>
        ),
    ],
    args: {
        colSpan: 11,
        enabledColumns: allColumns,
        issueTypes,
        onSubmit: fn(),
        nextIssueId: 13,
    },
} satisfies Meta<typeof QuickAddIssueRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Collapsed to a plain "New issue" link until it is clicked. */
export const Collapsed: Story = {};

export const Indented: Story = {
    args: { indent: 2, label: 'Add child issue' },
};

/** Opening the row, typing a title and pressing Enter submits it. */
export const Expanded: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', { name: /new issue/i }),
        );
        const input = await canvas.findByPlaceholderText(
            'What needs to be done?',
        );
        await userEvent.type(input, 'Fix the login redirect{Enter}');
        await expect(args.onSubmit).toHaveBeenCalledWith(
            'Fix the login redirect',
            1,
        );
    },
};

export const Submitting: Story = {
    args: { isSubmitting: true },
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: /new issue/i }),
        );
        await expect(
            await within(canvasElement).findByPlaceholderText(
                'What needs to be done?',
            ),
        ).toBeDisabled();
    },
};

export const FewColumns: Story = {
    args: {
        colSpan: 4,
        enabledColumns: { title: true, status: true },
        nextIssueId: null,
    },
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: /new issue/i }),
        );
    },
};
