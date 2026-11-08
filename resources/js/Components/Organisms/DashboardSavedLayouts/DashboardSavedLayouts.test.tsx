import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { makeSavedLayout, makeWidget } from '@/tests/dashboardLayout';
import { DashboardSavedLayout } from '@/types/Dashboard';
import DashboardSavedLayouts from './DashboardSavedLayouts';

const setup = (
    props: Partial<React.ComponentProps<typeof DashboardSavedLayouts>> = {},
) => {
    const handlers = {
        onSave: vi.fn(),
        onApply: vi.fn(),
        onRename: vi.fn(),
        onOverwrite: vi.fn(),
        onDelete: vi.fn(),
    };
    const view = render(
        <DashboardSavedLayouts
            layouts={[]}
            currentWidgets={[]}
            {...handlers}
            {...props}
        />,
    );

    const rerenderWith = (
        next: Partial<React.ComponentProps<typeof DashboardSavedLayouts>>,
    ) =>
        view.rerender(
            <DashboardSavedLayouts
                layouts={[]}
                currentWidgets={[]}
                {...handlers}
                {...next}
            />,
        );

    return { ...handlers, ...view, rerenderWith };
};

const layouts: DashboardSavedLayout[] = [
    makeSavedLayout(1, 'Focus', [
        makeWidget('trend'),
        makeWidget('completion', { visible: false }),
    ]),
    makeSavedLayout(2, 'Overview'),
];

describe('DashboardSavedLayouts', () => {
    test('invites to save the first layout when there are none', () => {
        setup();

        expect(screen.getByText('No saved layouts yet')).toBeInTheDocument();
    });

    test('lists the layouts with a picture and the number of widgets shown', () => {
        setup({ layouts });

        expect(screen.getAllByTestId('layout-preview')).toHaveLength(2);
        expect(screen.getByText('Focus')).toBeInTheDocument();
        expect(screen.getByText('1 widgets')).toBeInTheDocument();
        expect(screen.getByText('9 widgets')).toBeInTheDocument();
    });

    test('saves under the name that was typed, trimmed', async () => {
        const { onSave } = setup();

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            '  Wide  ',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(onSave).toHaveBeenCalledWith('Wide');
    });

    test('saves with the Enter key', async () => {
        const { onSave } = setup();

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Wide{Enter}',
        );

        expect(onSave).toHaveBeenCalledWith('Wide');
    });

    test('cannot save without a name', async () => {
        const { onSave } = setup();

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            '   ',
        );
        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
        expect(onSave).not.toHaveBeenCalled();
    });

    test('keeps the name to at most forty characters', async () => {
        setup();

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'a'.repeat(60),
        );

        expect(screen.getByLabelText('Save this layout as')).toHaveValue(
            'a'.repeat(40),
        );
    });

    test('says a name that exists will be replaced', async () => {
        setup({ layouts });

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Focus',
        );

        expect(
            screen.getByRole('button', { name: 'Replace' }),
        ).toBeInTheDocument();
        expect(screen.getByText(/will be replaced/)).toBeInTheDocument();
    });

    test('clears the name once the layouts arrive after saving', async () => {
        const { rerenderWith, onSave } = setup({ layouts: [] });

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Wide',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalled();

        rerenderWith({ layouts: [makeSavedLayout(3, 'Wide')] });

        expect(screen.getByLabelText('Save this layout as')).toHaveValue('');
    });

    test('keeps the name and shows the reason when saving failed', async () => {
        const { rerenderWith, onSave } = setup({ layouts });

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Wide',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        rerenderWith({
            layouts,
            error: 'You can keep at most 20 saved layouts.',
        });

        expect(screen.getByRole('alert')).toHaveTextContent('at most 20');
        expect(screen.getByLabelText('Save this layout as')).toHaveValue(
            'Wide',
        );
    });

    test('applies a layout', async () => {
        const { onApply } = setup({ layouts });

        await userEvent.click(
            screen.getByRole('button', { name: 'Apply Overview' }),
        );

        expect(onApply).toHaveBeenCalledWith(layouts[1]);
    });

    test('deleting asks for a confirmation first', async () => {
        const { onDelete } = setup({ layouts });

        await userEvent.click(
            screen.getByRole('button', { name: 'Delete Focus' }),
        );
        expect(onDelete).not.toHaveBeenCalled();

        await userEvent.click(
            screen.getByRole('button', { name: 'Confirm deleting Focus' }),
        );
        expect(onDelete).toHaveBeenCalledWith(1);
    });

    test('keeping a layout backs out of deleting it', async () => {
        const { onDelete } = setup({ layouts });

        await userEvent.click(
            screen.getByRole('button', { name: 'Delete Focus' }),
        );
        await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

        expect(onDelete).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Apply Focus' }),
        ).toBeInTheDocument();
    });

    describe('editing a saved layout', () => {
        test('marks the layout that is on the dashboard as the current one', () => {
            setup({ layouts, currentWidgets: layouts[1].widgets });

            expect(screen.getAllByText('Current')).toHaveLength(1);
            expect(
                screen.getByRole('button', {
                    name: 'Replace Overview with the current layout',
                }),
            ).toBeDisabled();
            expect(
                screen.getByRole('button', {
                    name: 'Replace Focus with the current layout',
                }),
            ).toBeEnabled();
        });

        test('replaces a layout with the current one after a confirmation', async () => {
            const { onOverwrite } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Replace Focus with the current layout',
                }),
            );
            expect(onOverwrite).not.toHaveBeenCalled();
            expect(
                screen.getByText('Replace it with the current layout?'),
            ).toBeInTheDocument();

            await userEvent.click(
                screen.getByRole('button', { name: 'Confirm replacing Focus' }),
            );
            expect(onOverwrite).toHaveBeenCalledWith(1);
        });

        test('keeping the layout backs out of replacing it', async () => {
            const { onOverwrite } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', {
                    name: 'Replace Focus with the current layout',
                }),
            );
            await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

            expect(onOverwrite).not.toHaveBeenCalled();
        });

        test('renames a layout', async () => {
            const { onRename } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Focus' }),
            );
            const input = screen.getByDisplayValue('Focus');
            await userEvent.clear(input);
            await userEvent.type(input, '  Deep work  ');
            await userEvent.click(
                screen.getByRole('button', { name: 'Save the name of Focus' }),
            );

            expect(onRename).toHaveBeenCalledWith(1, 'Deep work');
        });

        test('renames with the Enter key and leaves with Escape', async () => {
            const { onRename } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Focus' }),
            );
            await userEvent.type(screen.getByDisplayValue('Focus'), '!{Enter}');
            expect(onRename).toHaveBeenCalledWith(1, 'Focus!');

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Overview' }),
            );
            await userEvent.type(
                screen.getByDisplayValue('Overview'),
                '{Escape}',
            );
            expect(
                screen.queryByDisplayValue('Overview'),
            ).not.toBeInTheDocument();
        });

        test('an unchanged or empty name just leaves the rename', async () => {
            const { onRename } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Focus' }),
            );
            await userEvent.click(
                screen.getByRole('button', { name: 'Save the name of Focus' }),
            );

            expect(onRename).not.toHaveBeenCalled();
            expect(screen.queryByDisplayValue('Focus')).not.toBeInTheDocument();
        });

        test('cancelling a rename keeps the name', async () => {
            const { onRename } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Focus' }),
            );
            await userEvent.type(screen.getByDisplayValue('Focus'), 'x');
            await userEvent.click(
                screen.getByRole('button', { name: 'Cancel renaming' }),
            );

            expect(onRename).not.toHaveBeenCalled();
            expect(screen.getByText('Focus')).toBeInTheDocument();
        });

        test('leaves the rename once the new name arrived', async () => {
            const { rerenderWith } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Focus' }),
            );
            await userEvent.type(screen.getByDisplayValue('Focus'), '!{Enter}');

            rerenderWith({
                layouts: [{ ...layouts[0], name: 'Focus!' }, layouts[1]],
            });

            expect(screen.getByText('Focus!')).toBeInTheDocument();
            expect(
                screen.queryByDisplayValue('Focus!'),
            ).not.toBeInTheDocument();
        });

        test('stays in the rename and says why when the name was refused', async () => {
            const { rerenderWith } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Rename Focus' }),
            );
            await userEvent.type(screen.getByDisplayValue('Focus'), '!{Enter}');

            rerenderWith({
                layouts,
                error: 'You already have a layout with this name.',
            });

            expect(screen.getByRole('alert')).toHaveTextContent('already have');
            expect(screen.getByDisplayValue('Focus!')).toBeInTheDocument();
        });

        test('shows that a layout was applied for a moment', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            const { onApply } = setup({ layouts });

            await userEvent.click(
                screen.getByRole('button', { name: 'Apply Focus' }),
            );
            expect(onApply).toHaveBeenCalledWith(layouts[0]);
            expect(screen.getByText('Applied')).toBeInTheDocument();

            await act(async () => {
                vi.advanceTimersByTime(2000);
            });
            expect(screen.queryByText('Applied')).not.toBeInTheDocument();

            vi.useRealTimers();
        });
    });
});
