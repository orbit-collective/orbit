import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';
import { issue, users } from '@/stories/fixtures';
import EditableMarkdown from './EditableMarkdown';
import IssueMentionNodeView from './IssueMentionNodeView';

const description = `## Steps to reproduce

1. Let the session expire
2. Click any sidebar link

- [x] Reproduced on Chrome
- [ ] Reproduced on Safari

Expected: you land back on the page you were on. See **\`SessionTimeout\`** for details.`;

const meta = {
    title: 'Molecules/EditableMarkdown',
    component: EditableMarkdown,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-color)] p-4">
                <Story />
            </div>
        ),
    ],
    args: {
        value: description,
        onSave: fn(),
    },
} satisfies Meta<typeof EditableMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Rendered markdown; clicking it switches to the editor and saves on blur. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText(/Steps to reproduce/),
        ).toBeVisible();
    },
};

export const Empty: Story = {
    args: { value: '', placeholder: 'Describe the issue...' },
};

export const Disabled: Story = {
    args: { disabled: true },
};

/** With `users` and `projectId`, "@" and "#" open the mention menus. */
export const WithMentions: Story = {
    args: {
        value: 'Ping @[Marcus Lee](2) about this.',
        users,
        projectId: 1,
    },
};

/** The node view that renders an "#12" mention inside the editor. */
export const IssueMentionNodeViewPreview: Story = {
    render: () => (
        <IssueMentionNodeView
            {...({
                node: {
                    attrs: {
                        id: Number(issue.id),
                        number: issue.number,
                        label: issue.title,
                    },
                },
                extension: { options: { projectId: 1 } },
            } as unknown as Parameters<typeof IssueMentionNodeView>[0])}
        />
    ),
};
