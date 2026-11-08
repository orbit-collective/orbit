import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { makeSavedLayout, makeWidget } from '@/tests/dashboardLayout';
import { DashboardSavedLayout } from '@/types/Dashboard';
import DashboardSavedLayouts from './DashboardSavedLayouts';

const setup = (
    props: Partial<React.ComponentProps<typeof DashboardSavedLayouts>> = {},
) => {
    const handlers = { onSave: vi.fn(), onApply: vi.fn(), onDelete: vi.fn() };
    const view = render(
        <DashboardSavedLayouts layouts={[]} {...handlers} {...props} />,
    );

    return { ...handlers, ...view };
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
        const { rerender, onSave, onApply, onDelete } = setup({ layouts: [] });

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Wide',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        expect(onSave).toHaveBeenCalled();

        rerender(
            <DashboardSavedLayouts
                layouts={[makeSavedLayout(3, 'Wide')]}
                onSave={onSave}
                onApply={onApply}
                onDelete={onDelete}
            />,
        );

        expect(screen.getByLabelText('Save this layout as')).toHaveValue('');
    });

    test('keeps the name and shows the reason when saving failed', async () => {
        const { rerender, onSave, onApply, onDelete } = setup({ layouts });

        await userEvent.type(
            screen.getByLabelText('Save this layout as'),
            'Wide',
        );
        await userEvent.click(screen.getByRole('button', { name: 'Save' }));

        rerender(
            <DashboardSavedLayouts
                layouts={layouts}
                error="You can keep at most 20 saved layouts."
                onSave={onSave}
                onApply={onApply}
                onDelete={onDelete}
            />,
        );

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
});
