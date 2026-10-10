import { TourStep } from '@/types/Tour';
import { isTourSidebarOpen } from '@/utils/tourSidebar';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ProductTour from './ProductTour';

const mockVisit = vi.fn();
let mockUrl = '/';
let mockHasProjects = false;

vi.mock('@inertiajs/react', () => ({
    router: { visit: (...args: unknown[]) => mockVisit(...args) },
    usePage: () => ({
        url: mockUrl,
        props: { hasProjects: mockHasProjects },
    }),
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
        mockHasProjects = false;
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

    describe('interactive steps', () => {
        const rectOf = (element: HTMLElement) => {
            element.getBoundingClientRect = () =>
                ({ top: 100, left: 100, width: 120, height: 40 }) as DOMRect;
        };

        const addField = (id: string) => {
            const wrapper = document.createElement('div');
            wrapper.setAttribute('data-tour', id);
            const input = document.createElement('input');
            wrapper.appendChild(input);
            rectOf(wrapper);
            document.body.appendChild(wrapper);

            return { wrapper, input };
        };

        const addButton = (id: string, onClick = vi.fn()) => {
            const button = document.createElement('button');
            button.setAttribute('data-tour', id);
            button.addEventListener('click', onClick);
            rectOf(button);
            document.body.appendChild(button);

            return { button, onClick };
        };

        const interactiveSteps: TourStep[] = [
            {
                id: 'open',
                title: 'Open',
                description: 'o',
                target: 'plus',
                interaction: { type: 'click', hint: 'Click the plus' },
            },
            {
                id: 'name',
                title: 'Name',
                description: 'n',
                target: 'name-field',
                backTo: 'open',
                interaction: {
                    type: 'input',
                    required: true,
                    hint: 'Type a name',
                },
            },
            {
                id: 'submit',
                title: 'Submit',
                description: 's',
                target: 'submit-btn',
                backTo: 'open',
                interaction: {
                    type: 'click',
                    advance: 'external',
                    hint: 'Click create',
                },
                completeWhen: ({ hasProjects }) => hasProjects,
            },
            { id: 'end', title: 'End', description: 'e' },
        ];

        test('advances after the user clicks the target and shows the hint', async () => {
            const { onClick } = addButton('plus');
            render(<ProductTour steps={interactiveSteps} onClose={vi.fn()} />);

            expect(
                await screen.findByText('Click the plus'),
            ).toBeInTheDocument();

            addField('name-field');
            await userEvent.click(
                document.querySelector('[data-tour="plus"]') as HTMLElement,
            );

            expect(onClick).toHaveBeenCalledOnce();
            expect(await screen.findByText('Name')).toBeInTheDocument();
        });

        test('the arrow clicks the target for the user', async () => {
            const { onClick } = addButton('plus');
            addField('name-field');
            render(<ProductTour steps={interactiveSteps} onClose={vi.fn()} />);

            await userEvent.click(await screen.findByLabelText('Next step'));

            expect(onClick).toHaveBeenCalledOnce();
            expect(await screen.findByText('Name')).toBeInTheDocument();
        });

        test('leaves the target clickable by blocking only around it', async () => {
            addButton('plus');
            render(<ProductTour steps={interactiveSteps} onClose={vi.fn()} />);
            await screen.findByTestId('tour-spotlight');

            expect(screen.getAllByTestId('tour-blocker')).toHaveLength(4);
        });

        test('keeps the arrow disabled until a required field is filled', async () => {
            addButton('plus');
            const { input } = addField('name-field');
            render(<ProductTour steps={interactiveSteps} onClose={vi.fn()} />);
            await userEvent.click(await screen.findByLabelText('Next step'));
            await screen.findByText('Name');

            expect(screen.getByLabelText('Next step')).toBeDisabled();
            expect(input).toHaveFocus();

            await userEvent.type(input, 'Orbit');

            expect(screen.getByLabelText('Next step')).toBeEnabled();
        });

        test('does not treat typing keys as tour navigation', async () => {
            const onClose = vi.fn();
            addButton('plus');
            const { input } = addField('name-field');
            render(<ProductTour steps={interactiveSteps} onClose={onClose} />);
            await userEvent.click(await screen.findByLabelText('Next step'));
            await screen.findByText('Name');

            await userEvent.type(input, 'ab');
            await userEvent.keyboard('{ArrowLeft}{ArrowRight}{Escape}');

            expect(screen.getByText('Name')).toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();
        });

        test('moves on by itself once the external condition is met', async () => {
            addButton('submit-btn');
            const steps = interactiveSteps.slice(2);
            const { rerender } = render(
                <ProductTour steps={steps} onClose={vi.fn()} />,
            );
            await screen.findByText('Click create');

            mockHasProjects = true;
            rerender(<ProductTour steps={steps} onClose={vi.fn()} />);

            expect(await screen.findByText('End')).toBeInTheDocument();
        });

        test('goes back to the opening step when the modal is closed mid-step', async () => {
            // The hook re-measures on animation frames, so fake those too.
            vi.useFakeTimers({
                toFake: [
                    'setTimeout',
                    'clearTimeout',
                    'requestAnimationFrame',
                    'cancelAnimationFrame',
                ],
            });
            addButton('plus');
            const { wrapper } = addField('name-field');
            render(<ProductTour steps={interactiveSteps} onClose={vi.fn()} />);
            await act(async () => {
                screen.getByLabelText('Next step').click();
            });
            await act(async () => {
                vi.advanceTimersByTime(50);
            });
            expect(screen.getByText('Name')).toBeInTheDocument();

            await act(async () => {
                wrapper.remove();
            });
            await act(async () => {
                vi.advanceTimersByTime(1500);
            });

            expect(screen.getByText('Open')).toBeInTheDocument();
            vi.useRealTimers();
        });

        test('closes the modal when stepping back out of a modal step', async () => {
            const onEscape = vi.fn();
            window.addEventListener('keydown', onEscape);
            addButton('plus');
            addField('name-field');
            render(<ProductTour steps={interactiveSteps} onClose={vi.fn()} />);
            await userEvent.click(await screen.findByLabelText('Next step'));
            await screen.findByText('Name');

            await userEvent.click(screen.getByLabelText('Previous step'));

            expect(onEscape.mock.calls.some(([e]) => e.key === 'Escape')).toBe(
                true,
            );
            window.removeEventListener('keydown', onEscape);
        });
    });
});
