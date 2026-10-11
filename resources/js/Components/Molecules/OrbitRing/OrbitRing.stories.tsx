import type { Meta, StoryObj } from '@storybook/react-vite';
import { OrbitRing } from './OrbitRing';

const meta = {
    title: 'Molecules/OrbitRing',
    component: OrbitRing,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="relative h-[260px] w-[260px]">
                <Story />
            </div>
        ),
    ],
    args: {
        radius: 90,
        duration: 32,
        items: [
            { name: 'ListChecks', angle: 0 },
            { name: 'FolderGit2', angle: 120 },
            { name: 'Bell', angle: 240 },
        ],
    },
} satisfies Meta<typeof OrbitRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Reversed: Story = {
    args: { reverse: true },
};

export const OuterRing: Story = {
    args: {
        radius: 120,
        duration: 50,
        items: [
            { name: 'LayoutDashboard', angle: 30 },
            { name: 'Users', angle: 102 },
            { name: 'Calendar', angle: 174 },
            { name: 'Activity', angle: 246 },
            { name: 'GitBranch', angle: 318 },
        ],
    },
};
