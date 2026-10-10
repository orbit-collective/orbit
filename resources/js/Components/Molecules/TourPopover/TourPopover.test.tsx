import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import TourPopover from './TourPopover';

const setup = (overrides = {}) => {
    const props = {
        stepId: 'a',
        title: 'Your dashboard',
        description: 'Everything at a glance.',
        currentStep: 1,
        totalSteps: 4,
        placement: 'right' as const,
        arrowOffset: 30,
        style: { top: 10, left: 10 },
        onPrev: vi.fn(),
        onNext: vi.fn(),
        onClose: vi.fn(),
        ...overrides,
    };
    render(<TourPopover {...props} />);

    return props;
};

describe('TourPopover', () => {
    test('renders the step copy and progress', () => {
        setup();

        expect(
            screen.getByRole('dialog', { name: 'Your dashboard' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Everything at a glance.')).toBeInTheDocument();
        expect(screen.getByLabelText('Step 2 of 4')).toBeInTheDocument();
    });

    test('wires back, next and close', async () => {
        const props = setup();

        await userEvent.click(screen.getByLabelText('Previous step'));
        await userEvent.click(screen.getByLabelText('Next step'));
        await userEvent.click(screen.getByLabelText('Close tour'));

        expect(props.onPrev).toHaveBeenCalledOnce();
        expect(props.onNext).toHaveBeenCalledOnce();
        expect(props.onClose).toHaveBeenCalledOnce();
    });

    test('disables back on the first step', () => {
        setup({ currentStep: 0 });

        expect(screen.getByLabelText('Previous step')).toBeDisabled();
    });

    test('offers to finish on the last step', () => {
        setup({ currentStep: 3 });

        expect(screen.getByLabelText('Finish tour')).toBeInTheDocument();
    });

    test('keeps Tab focus inside the popover', async () => {
        setup();
        const next = screen.getByLabelText('Next step');
        const close = screen.getByLabelText('Close tour');

        expect(next).toHaveFocus();
        await userEvent.tab();
        expect(close).toHaveFocus();

        await userEvent.tab({ shift: true });
        await userEvent.tab({ shift: true });
        await userEvent.tab({ shift: true });
        expect(screen.getByRole('dialog')).toContainElement(
            document.activeElement as HTMLElement,
        );
    });

    test('hides the arrow when centered', () => {
        setup({ placement: 'center' });

        expect(
            screen.getByRole('dialog').querySelector('span[aria-hidden]'),
        ).toBeNull();
    });
});
