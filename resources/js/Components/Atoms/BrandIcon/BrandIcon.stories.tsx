import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import BrandIcon, { type BrandIconName } from './BrandIcon';

const names: BrandIconName[] = [
    'discord',
    'slack',
    'github',
    'google-drive',
    'google-calendar',
    'microsoft-teams',
    'zoom',
    'telegram',
    'gitlab',
    'bitbucket',
    'jira',
    'sentry',
    'circleci',
    'dropbox',
    'microsoft-onedrive',
    'box',
    'notion',
    'trello',
    'asana',
    'linear',
    'figma',
];

const meta = {
    title: 'Atoms/BrandIcon',
    component: BrandIcon,
    parameters: { layout: 'centered' },
    args: { name: 'github' },
    argTypes: { name: { control: 'select', options: names } },
} satisfies Meta<typeof BrandIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('img', { name: 'GitHub' }),
        ).toBeInTheDocument();
    },
};

export const Large: Story = {
    args: { className: 'h-12 w-12' },
};

export const AllBrands: Story = {
    render: () => (
        <div className="grid max-w-md grid-cols-7 gap-4 text-[var(--text-color)]">
            {names.map((name) => (
                <BrandIcon key={name} name={name} />
            ))}
        </div>
    ),
};
