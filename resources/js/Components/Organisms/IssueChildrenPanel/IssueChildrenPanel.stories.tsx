import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import {
    epicType,
    issueTypes,
    issues,
    makeIssue,
    project,
} from '@/stories/fixtures';
import IssueChildrenPanel from './IssueChildrenPanel';

const epic = makeIssue({
    id: '200',
    number: 20,
    title: 'Rework onboarding for new workspaces',
    issue_type_id: epicType.id,
    issueType: epicType,
    children: [issues[1], issues[3], issues[4]],
});

const meta = {
    title: 'Organisms/IssueChildrenPanel',
    component: IssueChildrenPanel,
    args: { project, issue: epic, issueTypes },
    decorators: [
        (Story) => (
            <div className="w-[640px] max-w-full bg-[var(--bg-color)] p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof IssueChildrenPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
    args: { issue: { ...epic, children: [] } },
};

/** The inline row opens from the "Add sub-issue" button and closes on Cancel. */
export const AddingSubIssue: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', { name: /add sub-issue/i }),
        );
        await expect(
            canvas.getByPlaceholderText('What needs to be done?'),
        ).toBeVisible();
        await userEvent.click(canvas.getByTitle('Cancel'));
        await expect(
            canvas.queryByPlaceholderText('What needs to be done?'),
        ).not.toBeInTheDocument();
    },
};
