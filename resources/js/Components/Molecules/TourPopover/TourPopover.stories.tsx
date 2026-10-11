import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import TourPopover from './TourPopover';

const meta = {
    title: 'Molecules/TourPopover',
    component: TourPopover,
    parameters: { layout: 'fullscreen' },
    args: {
        stepId: 'welcome',
        title: 'Welcome to Orbit',
        icon: 'Rocket',
        description:
            'Take a quick tour to learn where projects, issues and settings live.',
        currentStep: 0,
        totalSteps: 4,
        placement: 'center',
        arrowOffset: 0,
        style: { top: 80, left: 120 },
        onPrev: fn(),
        onNext: fn(),
        onClose: fn(),
    },
} satisfies Meta<typeof TourPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstStep: Story = {
    play: async ({ args, canvasElement }) => {
        const canvas = within(canvasElement.ownerDocument.body);
        await expect(
            canvas.getByRole('button', { name: 'Previous step' }),
        ).toBeDisabled();
        await userEvent.click(
            canvas.getByRole('button', { name: 'Next step' }),
        );
        await expect(args.onNext).toHaveBeenCalledTimes(1);
    },
};

export const MiddleStepWithArrow: Story = {
    args: {
        stepId: 'sidebar',
        title: 'Your projects',
        icon: undefined,
        description: 'Every project you belong to is listed in the sidebar.',
        currentStep: 1,
        placement: 'left',
        arrowOffset: 40,
    },
};

export const LastStep: Story = {
    args: {
        stepId: 'done',
        title: 'You are all set',
        currentStep: 3,
        placement: 'top',
        arrowOffset: 60,
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement.ownerDocument.body).getByRole('button', {
                name: 'Finish tour',
            }),
        ).toBeVisible();
    },
};

/** A step the user performs themselves: hint shown, next locked until done. */
export const InteractiveStepWithHint: Story = {
    args: {
        stepId: 'create',
        title: 'Create an issue',
        currentStep: 2,
        placement: 'bottom',
        arrowOffset: 50,
        interactive: true,
        nextDisabled: true,
        hint: { icon: 'MousePointerClick', text: 'Type a title to continue' },
    },
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement.ownerDocument.body).getByRole('button', {
                name: 'Next step',
            }),
        ).toBeDisabled();
    },
};

/** Stepping through, as the tour controller does. */
export const Walkthrough: Story = {
    render: function Render(args) {
        const [step, setStep] = useState(0);
        return (
            <TourPopover
                {...args}
                stepId={`step-${step}`}
                title={`Step ${step + 1}`}
                currentStep={step}
                onPrev={() => setStep((s) => Math.max(0, s - 1))}
                onNext={() =>
                    setStep((s) => Math.min(args.totalSteps - 1, s + 1))
                }
            />
        );
    },
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(body.getByRole('button', { name: 'Next step' }));
        await expect(
            body.getByRole('dialog', { name: 'Step 2' }),
        ).toBeVisible();
    },
};
