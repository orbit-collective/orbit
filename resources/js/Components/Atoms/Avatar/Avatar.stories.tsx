import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import Avatar from './Avatar';

const imageSrc =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='%238844da'/></svg>";

const meta = {
    title: 'Atoms/Avatar',
    component: Avatar,
    parameters: { layout: 'centered' },
    args: { initials: 'AK', size: 'md' },
    argTypes: {
        size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'xl'] },
    },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const WithImage: Story = {
    args: { src: imageSrc, alt: 'Ada Kowalska' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('img', { name: 'Ada Kowalska' }),
        ).toBeInTheDocument();
    },
};

export const Sizes: Story = {
    render: (args) => (
        <div className="flex items-center gap-3">
            {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                <Avatar key={size} {...args} size={size} />
            ))}
        </div>
    ),
};
