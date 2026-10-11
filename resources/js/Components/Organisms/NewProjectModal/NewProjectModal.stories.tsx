import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import NewProjectModal from './NewProjectModal';

const meta = {
    title: 'Organisms/NewProjectModal',
    component: NewProjectModal,
    parameters: { layout: 'fullscreen' },
    args: { isOpen: true, onClose: fn() },
} satisfies Meta<typeof NewProjectModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async () => {
        await expect(
            await within(document.body).findByText('Create New Project'),
        ).toBeVisible();
        await expect(
            within(document.body).getByPlaceholderText('Enter project name'),
        ).toBeVisible();
    },
};

export const FilledIn: Story = {
    play: async () => {
        const name = await within(document.body).findByPlaceholderText(
            'Enter project name',
        );
        await userEvent.type(name, 'Mobile app');
        await expect(name).toHaveValue('Mobile app');
    },
};

export const ValidationErrors: Story = {
    parameters: {
        inertia: { formErrors: { name: 'The name field is required.' } },
    },
    play: async () => {
        await userEvent.click(
            await within(document.body).findByRole('button', {
                name: /create project/i,
            }),
        );
        await expect(
            await within(document.body).findByText(
                'The name field is required.',
            ),
        ).toBeVisible();
    },
};
