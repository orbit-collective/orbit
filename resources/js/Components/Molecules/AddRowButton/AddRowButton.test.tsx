import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AddRowButton from './AddRowButton';

describe('AddRowButton', () => {
    test('shows its label and reports clicks', async () => {
        const onClick = vi.fn();
        render(<AddRowButton label="Add priority" onClick={onClick} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Add priority' }),
        );

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
