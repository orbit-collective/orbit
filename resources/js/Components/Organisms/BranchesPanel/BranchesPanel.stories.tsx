import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { buildBranch } from '@/tests/development';
import BranchesPanel, { BRANCHES_PAGE_SIZE } from './BranchesPanel';

const names = [
    'develop',
    'feat/login',
    'feat/board',
    'fix/typo',
    'chore/deps',
    'docs/readme',
];

const firstPage = [
    buildBranch(),
    ...names
        .slice(0, BRANCHES_PAGE_SIZE - 1)
        .map((name) =>
            buildBranch({ name, isDefault: false, protected: false }),
        ),
];

function PagingDemo(args: ComponentProps<typeof BranchesPanel>) {
    const [page, setPage] = useState(1);

    return <BranchesPanel {...args} page={page} onPageChange={setPage} />;
}

const meta = {
    title: 'Organisms/BranchesPanel',
    component: BranchesPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[420px]">
                <Story />
            </div>
        ),
    ],
    args: {
        branches: firstPage,
        total: 23,
        page: 1,
        onPageChange: () => {},
        error: null,
        onRetry: () => {},
        onCreate: () => {},
    },
} satisfies Meta<typeof BranchesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('1–6 of 23'),
        ).toBeInTheDocument();
    },
};

export const Paging: Story = {
    render: (args) => <PagingDemo {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(
            canvas.getByRole('button', { name: 'Next page' }),
        );
        await expect(canvas.getByText('7–12 of 23')).toBeInTheDocument();
    },
};

export const Loading: Story = {
    args: { branches: null },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('status'),
        ).toBeInTheDocument();
    },
};

export const Failed: Story = {
    args: { branches: null, error: 'Could not load branches.' },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('alert'),
        ).toBeInTheDocument();
    },
};
