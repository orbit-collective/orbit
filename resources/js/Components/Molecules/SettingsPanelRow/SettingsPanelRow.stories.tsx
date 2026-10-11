import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Button from '@/Components/Atoms/Button/Button';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import SettingsPanelRow from './SettingsPanelRow';

const meta = {
    title: 'Molecules/SettingsPanelRow',
    component: SettingsPanelRow,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[640px] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)]">
                <Story />
            </div>
        ),
    ],
    args: {
        title: 'Email digest',
        description: 'A daily summary of activity in your projects.',
    },
} satisfies Meta<typeof SettingsPanelRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Email digest'),
        ).toBeVisible();
    },
};

export const TitleOnly: Story = { args: { description: undefined } };

export const WithAction: Story = {
    args: { action: <Button>Configure</Button> },
};

export const WithToggle: Story = {
    args: { action: <ToggleSwitch checked onChange={() => {}} /> },
};

/** Children render below the title row, for forms or lists that belong to the setting. */
export const WithChildren: Story = {
    args: {
        action: <Button>Add</Button>,
        children: (
            <p className="text-sm text-[var(--text-muted-color)]">
                No items yet.
            </p>
        ),
    },
};
