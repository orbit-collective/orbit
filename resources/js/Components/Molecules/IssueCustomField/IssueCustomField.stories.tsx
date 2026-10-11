import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { IssueTypeField } from '@/types/IssueTypes';
import IssueCustomField from './IssueCustomField';

const makeField = (overrides: Partial<IssueTypeField>): IssueTypeField => ({
    id: 1,
    issueTypeId: 2,
    label: 'Environment',
    type: 'text',
    options: [],
    placeholder: null,
    isRequired: false,
    ...overrides,
});

const meta = {
    title: 'Molecules/IssueCustomField',
    component: IssueCustomField,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[260px]">
                <Story />
            </div>
        ),
    ],
    args: {
        field: makeField({}),
        value: 'Production',
        onSave: fn(),
    },
} satisfies Meta<typeof IssueCustomField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {};

export const TextEmpty: Story = {
    args: {
        field: makeField({ placeholder: 'Where did this happen?' }),
        value: null,
    },
};

export const Textarea: Story = {
    args: {
        field: makeField({ label: 'Steps', type: 'textarea' }),
        value: 'Open the board\nDrag a card',
    },
};

export const Number: Story = {
    args: {
        field: makeField({ label: 'Story points', type: 'number' }),
        value: 5,
    },
};

export const DateField: Story = {
    args: {
        field: makeField({ label: 'Due', type: 'date' }),
        value: '2026-10-20',
    },
};

/** Clicking the selected option again clears it. */
export const Select: Story = {
    args: {
        field: makeField({
            label: 'Severity',
            type: 'select',
            options: ['Minor', 'Major', 'Critical'],
        }),
        value: 'Major',
    },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole('button', { name: 'Critical' }));
        await expect(args.onSave).toHaveBeenCalledWith('Critical');
        await userEvent.click(canvas.getByRole('button', { name: 'Major' }));
        await expect(args.onSave).toHaveBeenCalledWith(null);
    },
};

export const Checkbox: Story = {
    args: {
        field: makeField({ label: 'Regression', type: 'checkbox' }),
        value: true,
    },
    play: async ({ canvasElement, args }) => {
        await userEvent.click(within(canvasElement).getByRole('checkbox'));
        await expect(args.onSave).toHaveBeenCalledWith(false);
    },
};

export const Disabled: Story = {
    args: {
        field: makeField({ label: 'Story points', type: 'number' }),
        value: 3,
        disabled: true,
    },
};
