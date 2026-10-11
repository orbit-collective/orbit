import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import SettingsPanel from './SettingsPanel';

const meta = {
    title: 'Molecules/SettingsPanel',
    component: SettingsPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[640px]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Notifications',
        description: 'Choose what you get notified about.',
        icon: 'Bell',
        children: (
            <>
                <SettingsPanelRow
                    title="Mentions"
                    description="When someone mentions you in a comment."
                />
                <SettingsPanelRow
                    title="Assignments"
                    description="When an issue is assigned to you."
                />
            </>
        ),
    },
} satisfies Meta<typeof SettingsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('heading', {
                name: 'Notifications',
            }),
        ).toBeVisible();
    },
};

export const WithoutIconAndDescription: Story = {
    args: { icon: undefined, description: undefined },
};

export const CustomContent: Story = {
    args: {
        title: 'Danger zone',
        icon: 'TriangleAlert',
        children: (
            <p className="px-5 py-4 text-sm text-[var(--text-gray-color)]">
                Any content can sit in the panel body.
            </p>
        ),
    },
};
