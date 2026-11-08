import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import DashboardEditorBar from './DashboardEditorBar';

const setup = (
    props: Partial<React.ComponentProps<typeof DashboardEditorBar>> = {},
) => {
    const handlers = { onSave: vi.fn(), onCancel: vi.fn(), onReset: vi.fn() };
    render(
        <DashboardEditorBar dirty saving={false} {...handlers} {...props} />,
    );

    return handlers;
};

describe('DashboardEditorBar', () => {
    test('saves and cancels', async () => {
        const { onSave, onCancel } = setup();

        await userEvent.click(screen.getByRole('button', { name: 'Save' }));
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onSave).toHaveBeenCalledOnce();
        expect(onCancel).toHaveBeenCalledOnce();
    });

    test('cannot save an unchanged layout', () => {
        setup({ dirty: false });

        expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    });

    test('shows progress and locks the buttons while saving', () => {
        setup({ saving: true });

        expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
    });

    test('reset asks for a confirmation before it runs', async () => {
        const { onReset } = setup();

        await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(onReset).not.toHaveBeenCalled();
        expect(
            screen.getByText('Back to the default layout?'),
        ).toBeInTheDocument();

        await userEvent.click(
            screen.getByRole('button', { name: 'Yes, reset' }),
        );
        expect(onReset).toHaveBeenCalledOnce();
        expect(
            screen.getByRole('button', { name: 'Save' }),
        ).toBeInTheDocument();
    });

    test('keeping the layout backs out of a reset', async () => {
        const { onReset } = setup();

        await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
        await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

        expect(onReset).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Save' }),
        ).toBeInTheDocument();
    });
});
