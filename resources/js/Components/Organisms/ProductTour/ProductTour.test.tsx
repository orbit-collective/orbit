import { TourStep } from '@/types/Tour';
import { isTourSidebarOpen } from '@/utils/tourSidebar';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProductTour from './ProductTour';

const mockVisit = vi.fn();
let mockUrl = '/';

vi.mock('@inertiajs/react', () => ({
    router: { visit: (...args: unknown[]) => mockVisit(...args) },
    usePage: () => ({ url: mockUrl }),
}));

const steps: TourStep[] = [
    { id: 'one', title: 'First', description: 'd1', visit: '/' },
    {
        id: 'two',
        title: 'Second',
        description: 'd2',
        visit: '/projects',
        target: 'nav-projects',
        placement: 'right',
    },
    { id: 'three', title: 'Third', description: 'd3', visit: () => null },
    { id: 'four', title: 'Fourth', description: 'd4' },
    { id: 'five', title: 'Fifth', description: 'd5', sidebar: true },
];

const addTarget = () => {
    const link = document.createElement('a');
    link.setAttribute('data-tour', 'nav-projects');
    link.getBoundingClientRect = () =>
        ({ top: 50, left: 20, width: 100, height: 30 }) as DOMRect;
    document.body.appendChild(link);
};

describe('ProductTour', () => {
    beforeEach(() => {
        mockVisit.mockClear();
        mockUrl = '/';
        document.body.innerHTML = '';
    });

    test('starts on the first step without navigating when already there', () => {
        render(<ProductTour steps={steps} onClose={vi.fn()} />);

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(mockVisit).not.toHaveBeenCalled();
    });

    test('navigates to the page of the next step and spotlights its target', async () => {
        addTarget();

        render(<ProductTour steps={steps} onClose={vi.fn()} />);
        await userEvent.click(screen.getByLabelText('Next step'));

        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(mockVisit).toHaveBeenCalledWith('/projects', {
            preserveScroll: true,
        });
        expect(await screen.findByTestId('tour-spotlight')).toBeInTheDocument();
    });

    test('skips steps whose page cannot be resolved, in both directions', async () => {
        addTarget();
        render(<ProductTour steps={steps} onClose={vi.fn()} />);
        await userEvent.click(screen.getByLabelText('Next step'));
        await userEvent.click(screen.getByLabelText('Next step'));

        expect(screen.getByText('Fourth')).toBeInTheDocument();

        await userEvent.click(screen.getByLabelText('Previous step'));

        expect(screen.getByText('Second')).toBeInTheDocument();
    });

    test('falls back to a centered card when the target never appears', async () => {
        vi.useFakeTimers();
        render(<ProductTour steps={steps} onClose={vi.fn()} />);
        await act(async () => {
            screen.getByLabelText('Next step').click();
        });

        expect(screen.queryByText('Second')).not.toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
        vi.useRealTimers();
    });

    test('centers the card quickly when the target exists but is hidden', async () => {
        vi.useFakeTimers();
        const link = document.createElement('a');
        link.setAttribute('data-tour', 'nav-projects');
        link.getBoundingClientRect = () =>
            ({ top: 0, left: -300, width: 260, height: 30 }) as DOMRect;
        document.body.appendChild(link);

        render(<ProductTour steps={steps} onClose={vi.fn()} />);
        await act(async () => {
            screen.getByLabelText('Next step').click();
        });
        await act(async () => {
            vi.advanceTimersByTime(900);
        });

        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.queryByTestId('tour-spotlight')).not.toBeInTheDocument();
        vi.useRealTimers();
    });

    test('opens the sidebar on sidebar steps and closes it afterwards', async () => {
        const { unmount } = render(
            <ProductTour steps={[...steps].reverse()} onClose={vi.fn()} />,
        );
        // reversed: first step is 'five' (sidebar)
        expect(isTourSidebarOpen()).toBe(true);

        await userEvent.click(screen.getByLabelText('Next step'));
        expect(isTourSidebarOpen()).toBe(false);

        await userEvent.click(screen.getByLabelText('Previous step'));
        expect(isTourSidebarOpen()).toBe(true);

        unmount();
        expect(isTourSidebarOpen()).toBe(false);
    });

    test('closes via the X button, Escape and finishing the last step', async () => {
        const onClose = vi.fn();
        render(<ProductTour steps={steps} onClose={onClose} />);

        await userEvent.click(screen.getByLabelText('Close tour'));
        await userEvent.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(2);

        await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
        await userEvent.click(screen.getByLabelText('Finish tour'));
        expect(onClose).toHaveBeenCalledTimes(3);
    });
});
