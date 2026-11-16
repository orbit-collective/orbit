import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import ListPager from './ListPager';

function PagerDemo(args: ComponentProps<typeof ListPager>) {
    const [page, setPage] = useState(args.page);

    return <ListPager {...args} page={page} onPageChange={setPage} />;
}

const meta = {
    title: 'Molecules/ListPager',
    component: ListPager,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[360px]">
                <Story />
            </div>
        ),
    ],
    args: {
        label: 'Branches',
        page: 1,
        pageSize: 6,
        total: 20,
        onPageChange: () => {},
    },
    render: (args) => <PagerDemo {...args} />,
} satisfies Meta<typeof ListPager>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', { name: 'Next page' }),
        );
        await expect(canvas.getByText('7–12 of 20')).toBeInTheDocument();
    },
};
