import type { Meta, StoryObj } from '@storybook/react-vite';
import Skeleton from './Skeleton';

const meta = {
    title: 'Atoms/Skeleton',
    component: Skeleton,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rows: Story = {
    render: () => (
        <div className="w-72 space-y-3">
            {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-2">
                    <Skeleton index={index} className="h-3 w-2/3" />
                    <Skeleton index={index} className="h-3 w-full" />
                </div>
            ))}
        </div>
    ),
};
