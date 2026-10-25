import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import InlineEditRow, { inlineFieldClass } from './InlineEditRow';

const renderRow = (
    props: Partial<Parameters<typeof InlineEditRow>[0]> = {},
) => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
        <InlineEditRow
            leading={<span>lead</span>}
            canSave
            saveLabel="Create thing"
            onSave={onSave}
            onCancel={onCancel}
            {...props}
        >
            <input aria-label="field" className={inlineFieldClass} />
        </InlineEditRow>,
    );

    return { onSave, onCancel };
};

describe('InlineEditRow', () => {
    test('renders the leading slot, the fields and both buttons', () => {
        renderRow({ extras: <span>extra</span> });

        expect(screen.getByText('lead')).toBeInTheDocument();
        expect(screen.getByLabelText('field')).toBeInTheDocument();
        expect(screen.getByText('extra')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Create thing' }),
        ).toBeEnabled();
        expect(
            screen.getByRole('button', { name: 'Cancel' }),
        ).toBeInTheDocument();
    });

    test('Enter in a field saves when saving is allowed', async () => {
        const user = userEvent.setup();
        const { onSave } = renderRow();

        await user.type(screen.getByLabelText('field'), 'x{Enter}');

        expect(onSave).toHaveBeenCalledTimes(1);
    });

    test('Enter in a field does not save when it is not allowed', async () => {
        const user = userEvent.setup();
        const { onSave } = renderRow({ canSave: false });

        await user.type(screen.getByLabelText('field'), 'x{Enter}');

        expect(onSave).not.toHaveBeenCalled();
        expect(
            screen.getByRole('button', { name: 'Create thing' }),
        ).toBeDisabled();
    });

    test('Escape cancels', async () => {
        const user = userEvent.setup();
        const { onCancel } = renderRow();

        await user.type(screen.getByLabelText('field'), '{Escape}');

        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('Enter on a button is left to that button', async () => {
        const user = userEvent.setup();
        const { onSave, onCancel } = renderRow();

        screen.getByRole('button', { name: 'Cancel' }).focus();
        await user.keyboard('{Enter}');

        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onSave).not.toHaveBeenCalled();
    });

    test('shows an error under the row', () => {
        renderRow({ error: 'That name is taken.' });

        expect(screen.getByRole('alert')).toHaveTextContent(
            'That name is taken.',
        );
    });
});
