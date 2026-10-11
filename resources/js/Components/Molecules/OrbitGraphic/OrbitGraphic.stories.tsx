import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrbitGraphic } from './OrbitGraphic';

const meta = {
    title: 'Molecules/OrbitGraphic',
    component: OrbitGraphic,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="flex w-[420px] rounded-xl bg-[var(--bg-color)] p-6">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof OrbitGraphic>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The animated logo with two counter-rotating rings of feature icons. */
export const Default: Story = {};
