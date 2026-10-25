import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import ToggleChip from './ToggleChip';

const meta = {
    title: 'Molecules/ToggleChip',
    component: ToggleChip,
    parameters: { layout: 'centered' },
    args: { label: 'Assignee', pressed: false, onClick: fn() },
} satisfies Meta<typeof ToggleChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { pressed: true } };

export const Disabled: Story = { args: { disabled: true } };
