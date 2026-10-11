import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import NavItem from './NavItem';

const meta = {
    title: 'Molecules/NavItem',
    component: NavItem,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[220px] rounded-lg bg-[var(--bg-color)] p-2">
                <Story />
            </div>
        ),
    ],
    args: { icon: 'LayoutDashboard', label: 'Dashboard', link: '/dashboard' },
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('link', { name: /Dashboard/ }),
        ).toHaveAttribute('href', '/dashboard');
    },
};

export const Active: Story = {
    args: { isActive: true },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByRole('link')).toHaveAttribute(
            'aria-current',
            'page',
        );
    },
};

export const WithShortcutBadge: Story = {
    args: { badge: 'G' },
};

/** Without an icon a colored dot is shown instead. */
export const DotInsteadOfIcon: Story = {
    args: {
        icon: undefined,
        label: 'Orbit',
        iconClassName: 'bg-[var(--accent-color)]',
    },
};

export const Collapsed: Story = {
    args: { collapsed: true },
    decorators: [
        (Story) => (
            <div className="w-[48px]">
                <Story />
            </div>
        ),
    ],
};

/** Not-yet-available destinations render as a non-interactive "Soon" row. */
export const Disabled: Story = {
    args: { disabled: true, icon: 'Calendar', label: 'Roadmap' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByRole('link')).toBeNull();
        await expect(canvas.getByText('Soon')).toBeVisible();
    },
};
