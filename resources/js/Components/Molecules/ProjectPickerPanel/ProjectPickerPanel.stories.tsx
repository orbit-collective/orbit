import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import ProjectPickerPanel from './ProjectPickerPanel';

const meta = {
    title: 'Molecules/ProjectPickerPanel',
    component: ProjectPickerPanel,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[760px]">
                <Story />
            </div>
        ),
    ],
    args: {
        projects: [
            { id: 1, name: 'Orbit', color: 'purple' },
            { id: 2, name: 'Mobile App', color: 'sky' },
            { id: 3, name: 'Marketing Site', color: 'pink' },
            { id: 4, name: 'Billing', color: 'green' },
        ],
        selectedProjectId: 1,
        description: 'Choose which project these settings apply to.',
        onSelect: fn(),
    },
} satisfies Meta<typeof ProjectPickerPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.getByText('Currently viewing')).toBeVisible();
        await userEvent.click(
            canvas.getByRole('button', { name: /Mobile App/ }),
        );
        await expect(args.onSelect).toHaveBeenCalledWith(2);
    },
};

/** The selection is owned by the parent; picking a card moves the check. */
export const Interactive: Story = {
    render: function Render(args) {
        const [selected, setSelected] = useState(args.selectedProjectId);
        return (
            <ProjectPickerPanel
                {...args}
                selectedProjectId={selected}
                onSelect={setSelected}
            />
        );
    },
};

export const LongNames: Story = {
    args: {
        projects: [
            {
                id: 1,
                name: 'A very long project name that has to be truncated',
                color: 'red',
            },
            { id: 2, name: 'Short', color: 'orange' },
        ],
    },
};

/** With a single project there is nothing to pick, so the panel renders nothing. */
export const SingleProject: Story = {
    args: { projects: [{ id: 1, name: 'Orbit', color: 'purple' }] },
    play: async ({ canvasElement }) => {
        await expect(canvasElement.querySelector('section')).toBeNull();
    },
};
