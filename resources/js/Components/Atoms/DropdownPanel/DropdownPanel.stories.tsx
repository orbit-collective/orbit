import type { Meta, StoryObj } from '@storybook/react-vite';
import DropdownOption from '@/Components/Atoms/DropdownOption/DropdownOption';
import DropdownPanel from './DropdownPanel';

const meta = {
    title: 'Atoms/DropdownPanel',
    component: DropdownPanel,
    parameters: { layout: 'centered' },
    args: { className: 'w-60 p-1' },
} satisfies Meta<typeof DropdownPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOptions: Story = {
    render: (args) => (
        <DropdownPanel {...args}>
            <DropdownOption label="Backlog" />
            <DropdownOption label="In progress" isSelected />
            <DropdownOption label="Done" />
        </DropdownPanel>
    ),
};

export const Empty: Story = {
    render: (args) => (
        <DropdownPanel {...args}>
            <p className="px-3 py-2 text-xs text-[var(--text-muted-color)]">
                No results
            </p>
        </DropdownPanel>
    ),
};
