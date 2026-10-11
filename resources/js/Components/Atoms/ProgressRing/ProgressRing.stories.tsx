import type { Meta, StoryObj } from '@storybook/react-vite';
import ProgressRing from './ProgressRing';

const meta = {
    title: 'Atoms/ProgressRing',
    component: ProgressRing,
    parameters: { layout: 'centered' },
    args: { progress: 60 },
    argTypes: {
        progress: { control: { type: 'range', min: 0, max: 100, step: 5 } },
    },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { progress: 0 } };

export const Complete: Story = { args: { progress: 100 } };

export const Large: Story = { args: { radius: 40, stroke: 4 } };

export const CustomColor: Story = {
    args: { colorClass: 'stroke-[var(--success-color)]' },
};
