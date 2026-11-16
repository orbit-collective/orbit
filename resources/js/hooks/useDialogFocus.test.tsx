import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, test } from 'vitest';
import { useDialogFocus } from './useDialogFocus';

function Dialog({ autofocus = false }: { autofocus?: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    useDialogFocus(ref);

    return (
        <div ref={ref} role="dialog">
            <button>first</button>
            <input aria-label="field" data-autofocus={autofocus || undefined} />
            <button>last</button>
        </div>
    );
}

function Host({ open }: { open: boolean }) {
    return (
        <>
            <button>opener</button>
            {open && <Dialog />}
        </>
    );
}

describe('useDialogFocus', () => {
    test('focuses the first control, or the one marked data-autofocus', () => {
        const { unmount } = render(<Dialog />);
        expect(screen.getByText('first')).toHaveFocus();
        unmount();

        render(<Dialog autofocus />);
        expect(screen.getByLabelText('field')).toHaveFocus();
    });

    test('keeps Tab and Shift+Tab inside', async () => {
        const user = userEvent.setup();
        render(<Dialog />);

        await user.tab({ shift: true });
        expect(screen.getByText('last')).toHaveFocus();

        await user.tab();
        expect(screen.getByText('first')).toHaveFocus();
    });

    test('gives focus back to what had it when it closes', () => {
        const { rerender } = render(<Host open={false} />);
        screen.getByText('opener').focus();

        rerender(<Host open />);
        expect(screen.getByText('first')).toHaveFocus();

        rerender(<Host open={false} />);
        expect(screen.getByText('opener')).toHaveFocus();
    });
});
