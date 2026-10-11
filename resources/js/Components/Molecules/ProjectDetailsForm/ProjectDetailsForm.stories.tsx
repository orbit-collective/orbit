import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import type { ProjectDetails } from '@/types/ProjectMembers';
import ProjectDetailsForm from './ProjectDetailsForm';

const meta = {
    title: 'Molecules/ProjectDetailsForm',
    component: ProjectDetailsForm,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[520px]">
                <Story />
            </div>
        ),
    ],
    args: {
        draft: {
            name: 'Orbit',
            description: 'The issue tracker itself.',
            color: 'purple',
        },
        isSaving: false,
        onChange: fn(),
        onSubmit: fn((event) => event.preventDefault()),
    },
} satisfies Meta<typeof ProjectDetailsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Saving: Story = {
    args: { isSaving: true },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByRole('button', { name: 'Saving...' }),
        ).toBeDisabled();
    },
};

export const EmptyDescription: Story = {
    args: { draft: { name: 'Billing', description: null, color: 'green' } },
};

/** Typing and picking a color update the draft held by the parent. */
export const Editable: Story = {
    render: function Render(args) {
        const [draft, setDraft] = useState<ProjectDetails>(args.draft);
        return (
            <ProjectDetailsForm
                {...args}
                draft={draft}
                onChange={(next) => {
                    setDraft(next);
                    args.onChange(next);
                }}
            />
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.type(canvas.getAllByRole('textbox')[0], ' 2');
        await expect(canvas.getAllByRole('textbox')[0]).toHaveValue('Orbit 2');
        await userEvent.click(
            canvas.getByRole('button', { name: 'Select red color' }),
        );
    },
};
