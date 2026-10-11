import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { issues, users } from '@/stories/fixtures';
import MentionSuggestions from './MentionSuggestions';

const suggestions = issues.slice(0, 4).map((item) => ({
    id: Number(item.id),
    number: item.number,
    title: item.title,
    status: item.status,
    priority: item.priority,
    labels: item.labels,
    assignee: null,
}));

const meta = {
    title: 'Molecules/MentionSuggestions',
    component: MentionSuggestions,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-[380px] p-4 text-sm text-[var(--text-color)]">
                Hey @ma
                <Story />
            </div>
        ),
    ],
    args: {
        id: 'mention-menu',
        users,
        activeIndex: 0,
        // Just below the typed line, which sits at y=40.
        position: { top: 64, lineTop: 40, left: 60 },
        onSelect: fn(),
        onHover: fn(),
    },
} satisfies Meta<typeof MentionSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Members: Story = {
    play: async ({ args }) => {
        const option = await within(document.body).findByText('Priya Patel');
        await userEvent.click(option);
        await expect(args.onSelect).toHaveBeenCalledWith(users[2]);
    },
};

/** Members that share a display name get their id appended. */
export const DuplicateNames: Story = {
    args: {
        users: [
            ...users.slice(0, 2),
            { id: 9, name: 'Marcus Lee', avatar: null },
        ],
    },
};

export const Issues: Story = {
    args: {
        kind: 'issue',
        users: [],
        issues: suggestions,
        onSelectIssue: fn(),
    },
};

export const NoResults: Story = {
    args: { users: [], emptyLabel: 'No matching members' },
    play: async () => {
        await expect(
            await within(document.body).findByText('No matching members'),
        ).toBeVisible();
    },
};
