import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import SlashCommandMenu from './SlashCommandMenu';

const items = [
    {
        id: 'heading_1',
        icon: 'Heading1' as const,
        title: 'Heading 1',
        description: 'Large section heading',
    },
    {
        id: 'bullet_list',
        icon: 'List' as const,
        title: 'Bulleted list',
        description: 'A simple list of points',
    },
    {
        id: 'task_list',
        icon: 'ListTodo' as const,
        title: 'Task list',
        description: 'A checklist with checkboxes',
    },
    {
        id: 'table',
        icon: 'Table' as const,
        title: 'Table',
        description: 'A 3 × 3 table to fill in',
    },
];

const meta = {
    title: 'Molecules/SlashCommandMenu',
    component: SlashCommandMenu,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <div className="h-[380px] p-4 text-sm text-(--text-color)">
                Steps to reproduce /
                <Story />
            </div>
        ),
    ],
    args: {
        id: 'slash-menu',
        items,
        activeIndex: 0,
        position: { top: 140, lineTop: 120, left: 180 },
        onSelect: fn(),
        onHover: fn(),
    },
} satisfies Meta<typeof SlashCommandMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args }) => {
        const body = within(document.body);

        await expect(
            await body.findByRole('option', { name: /Bulleted list/ }),
        ).toBeVisible();

        await userEvent.click(body.getByRole('option', { name: /Table/ }));
        await expect(args.onSelect).toHaveBeenCalledWith(3);
    },
};

export const SecondRowActive: Story = {
    args: { activeIndex: 1 },
};
