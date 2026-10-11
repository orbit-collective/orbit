import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { issueTypes, issues, project } from '@/stories/fixtures';
import { IssueTable } from './IssueTable';

const meta = {
    title: 'Organisms/IssueTable',
    component: IssueTable,
    parameters: { layout: 'fullscreen' },
    args: {
        issues,
        project,
        issueTypes,
        queryParams: {},
        nextIssueId: 18,
    },
    decorators: [
        (Story) => (
            <div className="flex min-h-[480px] bg-[var(--bg-color)] p-4">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof IssueTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(issues[0].title),
        ).toBeVisible();
    },
};

export const Empty: Story = {
    args: { issues: [] },
};

export const SortedByTitle: Story = {
    args: { queryParams: { sort: 'title', direction: 'AZ' } },
};

/** Without a project there is no quick-add row and no column persistence. */
export const WithoutProject: Story = {
    args: { project: undefined },
};

export const Bare: Story = {
    args: { bare: true },
};

export const FewColumns: Story = {
    args: {
        project: {
            ...project,
            columns: { id: true, title: true, status: true, priority: true },
        },
    },
};

/** Ticking a row checkbox brings up the bulk action bar. */
export const SelectingRows: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const [selectAll] = canvas.getAllByRole('checkbox');
        await userEvent.click(selectAll);
        await expect(selectAll).toBeChecked();
    },
};
