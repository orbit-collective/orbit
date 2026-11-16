import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { buildBranch } from '@/tests/development';
import CreateBranchModal from './CreateBranchModal';

const meta = {
    title: 'Organisms/CreateBranchModal',
    component: CreateBranchModal,
    parameters: { layout: 'fullscreen' },
    args: {
        repositoryName: 'orbit-collective/orbit',
        branches: [
            buildBranch(),
            buildBranch({
                name: 'develop',
                isDefault: false,
                protected: false,
            }),
        ],
        busy: false,
        onCreate: async () => true,
        onClose: () => {},
    },
} satisfies Meta<typeof CreateBranchModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        const dialog = within(
            await within(document.body).findByRole('dialog', {
                name: 'Create a branch',
            }),
        );
        await expect(dialog.getByLabelText('Branch name')).toHaveFocus();
    },
};

export const InvalidName: Story = {
    play: async () => {
        const dialog = within(
            await within(document.body).findByRole('dialog', {
                name: 'Create a branch',
            }),
        );
        await userEvent.type(dialog.getByLabelText('Branch name'), 'bad name');
        await userEvent.click(
            dialog.getByRole('button', { name: 'Create branch' }),
        );
        await expect(await dialog.findByRole('alert')).toBeVisible();
    },
};
