import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import Icon from '@/Components/Atoms/Icon/Icon';
import InlineEditRow, { inlineFieldClass } from './InlineEditRow';

const meta = {
    title: 'Molecules/InlineEditRow',
    component: InlineEditRow,
    parameters: { layout: 'padded' },
    args: {
        leading: (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-light-color)]">
                <Icon name="Flag" size={16} />
            </span>
        ),
        children: (
            <input
                aria-label="Name"
                placeholder="Name"
                defaultValue="Blocker"
                className={inlineFieldClass}
            />
        ),
        canSave: true,
        saveLabel: 'Save',
        onSave: fn(),
        onCancel: fn(),
    },
} satisfies Meta<typeof InlineEditRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement, args }) => {
        await userEvent.type(
            within(canvasElement).getByLabelText('Name'),
            '{Enter}',
        );
        await expect(args.onSave).toHaveBeenCalled();
    },
};

export const CannotSaveYet: Story = { args: { canSave: false } };

export const WithError: Story = {
    args: { error: 'That name is already taken.' },
};
