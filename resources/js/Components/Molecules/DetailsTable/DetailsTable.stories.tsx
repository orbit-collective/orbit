import type { Meta, StoryObj } from '@storybook/react-vite';
import DetailsTable from './DetailsTable';

const meta: Meta<typeof DetailsTable> = {
    title: 'Molecules/DetailsTable',
    component: DetailsTable,
};

export default meta;

type Story = StoryObj<typeof DetailsTable>;

export const Default: Story = {
    args: {
        rows: [
            { icon: 'Building', label: 'Vendor', value: 'By Discord Inc.' },
            { icon: 'Tag', label: 'Category', value: 'Communication' },
            { icon: 'Plug', label: 'Status', value: 'Connected' },
            { icon: 'Globe', label: 'Website', value: 'discord.com' },
        ],
    },
};
