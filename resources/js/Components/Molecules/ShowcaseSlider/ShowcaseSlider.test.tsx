import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ShowcaseSlider } from './ShowcaseSlider';

describe('ShowcaseSlider Component', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('renders the first slide text', () => {
        render(<ShowcaseSlider />);

        expect(
            screen.getByText(
                'Built for teams who plan, ship, and track work together',
                { exact: false },
            ),
        ).toBeInTheDocument();
    });

    test('renders navigation dots for each slide', () => {
        render(<ShowcaseSlider />);

        expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    test('advances to the next slide after the autoplay interval', () => {
        render(<ShowcaseSlider autoPlayInterval={1000} />);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByLabelText('Go to slide 2')).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    test('switches slide when a dot is clicked', () => {
        render(<ShowcaseSlider />);

        fireEvent.click(screen.getByLabelText('Go to slide 3'));

        expect(screen.getByLabelText('Go to slide 3')).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    test('pauses autoplay while the slider is hovered', () => {
        render(<ShowcaseSlider autoPlayInterval={1000} />);

        const container = screen
            .getByText(
                'Built for teams who plan, ship, and track work together',
                {
                    exact: false,
                },
            )
            .closest('div') as HTMLElement;

        fireEvent.mouseEnter(container);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(
            screen.getByText(
                'Built for teams who plan, ship, and track work together',
                { exact: false },
            ),
        ).toBeInTheDocument();
    });

    test('resumes autoplay after the mouse leaves the slider', () => {
        render(<ShowcaseSlider autoPlayInterval={1000} />);

        const container = screen
            .getByText(
                'Built for teams who plan, ship, and track work together',
                { exact: false },
            )
            .closest('div') as HTMLElement;

        fireEvent.mouseEnter(container);
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        fireEvent.mouseLeave(container);
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByLabelText('Go to slide 2')).toHaveAttribute(
            'aria-current',
            'true',
        );
    });

    test('pauses autoplay on focus and resumes on blur-sm', () => {
        render(<ShowcaseSlider autoPlayInterval={1000} />);

        const container = screen
            .getByText(
                'Built for teams who plan, ship, and track work together',
                { exact: false },
            )
            .closest('div') as HTMLElement;

        fireEvent.focus(container);
        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(
            screen.getByText(
                'Built for teams who plan, ship, and track work together',
                { exact: false },
            ),
        ).toBeInTheDocument();

        fireEvent.blur(container);
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(screen.getByLabelText('Go to slide 2')).toHaveAttribute(
            'aria-current',
            'true',
        );
    });
});
