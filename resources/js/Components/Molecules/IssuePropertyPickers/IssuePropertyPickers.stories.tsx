import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { issueTypes, priorities, users } from '@/stories/fixtures';
import {
    AssigneePicker,
    DatePicker,
    PriorityPicker,
    StatusPicker,
} from './IssuePropertyPickers';

const statuses = issueTypes[0].statuses ?? [];

const meta = {
    title: 'Molecules/IssuePropertyPickers',
    component: StatusPicker,
    parameters: { layout: 'padded' },
    args: {
        statuses,
        value: statuses[0] ?? null,
        onChange: fn(),
    },
} satisfies Meta<typeof StatusPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Status: Story = {
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);

        await userEvent.click(await canvas.findByLabelText('Status'));
        const options = within(document.body).getAllByRole('option');
        await userEvent.click(options[options.length - 1]);
        await expect(args.onChange).toHaveBeenCalled();
    },
};

export const Disabled: Story = {
    args: { disabled: true },
};

export const AllPickers: Story = {
    render: () => (
        <div className="flex flex-col items-start gap-3">
            <AssigneePicker
                users={users}
                value={users[0]}
                selectedId={users[0].id}
                onChange={fn()}
            />
            <PriorityPicker
                priorities={priorities}
                value={priorities[0]}
                onChange={fn()}
            />
            <DatePicker label="Start date" value="2026-11-03" onChange={fn()} />
            <DatePicker label="End date" value={null} onChange={fn()} />
        </div>
    ),
};
