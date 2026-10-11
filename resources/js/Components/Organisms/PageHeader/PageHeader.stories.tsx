import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { notifications } from '@/stories/fixtures';
import PageHeader from './PageHeader';

const meta = {
    title: 'Organisms/PageHeader',
    component: PageHeader,
    parameters: { layout: 'fullscreen' },
    args: {
        title: 'Orbit',
        icon: 'FolderGit2',
        showDate: true,
        showSettingsIcon: true,
    },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPrimaryAction: Story = {
    args: {
        primaryAction: { label: 'New issue', onClick: fn(), icon: 'Plus' },
    },
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: /new issue/i }),
        );
        await expect(args.primaryAction?.onClick).toHaveBeenCalledTimes(1);
    },
};

/** The project color tints the header icon (the same color the sidebar dot uses). */
export const ProjectColor: Story = {
    args: { iconColors: 'pink' },
};

export const WithTabs: Story = {
    args: {
        tabs: [
            {
                id: 'list',
                label: 'List',
                icon: 'Rows3',
                isActive: true,
                onClick: fn(),
            },
            {
                id: 'board',
                label: 'Board',
                icon: 'Columns3',
                isActive: false,
                onClick: fn(),
            },
            {
                id: 'calendar',
                label: 'Calendar',
                icon: 'CalendarDays',
                isActive: false,
                onClick: fn(),
            },
        ],
    },
};

/** Unread notifications put a count on the bell, which opens the popup. */
export const UnreadNotifications: Story = {
    parameters: { inertia: { props: { notifications } } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('2')).toBeVisible();
    },
};

/** The search button asks the palette provider to open the command palette. */
export const OpensCommandPalette: Story = {
    play: async ({ canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', {
                name: 'Open command palette',
            }),
        );
    },
};
