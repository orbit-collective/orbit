import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import DropdownPanel from '@/Components/Atoms/DropdownPanel/DropdownPanel';
import DropdownOption from './DropdownOption';

const meta = {
    title: 'Atoms/DropdownOption',
    component: DropdownOption,
    parameters: { layout: 'centered' },
    args: { label: 'In progress', onClick: fn() },
    argTypes: {
        indicator: { control: 'inline-radio', options: ['check', 'none'] },
        tone: { control: 'inline-radio', options: ['default', 'danger'] },
    },
    decorators: [
        (Story) => (
            <DropdownPanel className="w-60 p-1">
                <Story />
            </DropdownPanel>
        ),
    ],
} satisfies Meta<typeof DropdownOption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { isSelected: true } };

export const WithIconAndDescription: Story = {
    args: {
        icon: 'Flag',
        iconColor: 'var(--accent-color)',
        description: 'Work has started on this issue',
        trailing: 'G I',
    },
};

export const ActionRow: Story = {
    args: { indicator: 'none', icon: 'Copy', label: 'Copy link' },
};

export const Danger: Story = {
    args: { indicator: 'none', tone: 'danger', icon: 'Trash', label: 'Delete' },
};

export const Disabled: Story = { args: { disabled: true } };

export const RunsOnClick: Story = {
    play: async ({ args, canvasElement }) => {
        await userEvent.click(
            within(canvasElement).getByRole('button', { name: /In progress/ }),
        );
        await expect(args.onClick).toHaveBeenCalledTimes(1);
    },
};
