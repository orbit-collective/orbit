import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
    epicType,
    issue,
    issues,
    makeIssue,
    project,
} from '@/stories/fixtures';
import IssuePageHeader from './IssuePageHeader';

const meta = {
    title: 'Organisms/IssuePageHeader',
    component: IssuePageHeader,
    parameters: { layout: 'fullscreen' },
    args: { project, issue },
} satisfies Meta<typeof IssuePageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText(/#12 Fix login redirect/),
        ).toBeVisible();
    },
};

/** A sub-issue shows its ancestors as breadcrumb crumbs, root first. */
export const WithAncestors: Story = {
    args: {
        ancestors: [
            makeIssue({
                id: '200',
                number: 20,
                title: 'Rework onboarding for new workspaces',
                issueType: epicType,
            }),
            issues[1],
        ],
    },
};

export const LongTitle: Story = {
    args: {
        issue: makeIssue({
            title: 'Investigate why the session timeout redirect drops the original URL, the query string and the hash fragment for deep links',
        }),
    },
};
