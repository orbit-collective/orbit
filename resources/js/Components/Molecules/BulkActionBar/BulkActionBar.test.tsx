import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { BulkActionBar } from './BulkActionBar';

describe('BulkActionBar Component', () => {
    test('renders nothing when selectedCount is 0', () => {
        const { container } = render(
            <BulkActionBar
                selectedCount={0}
                onBulkDelete={vi.fn()}
                isDeleting={false}
            />,
        );

        expect(container).toBeEmptyDOMElement();
    });

    test('shows the selected count', () => {
        render(
            <BulkActionBar
                selectedCount={3}
                onBulkDelete={vi.fn()}
                isDeleting={false}
            />,
        );

        expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('calls onBulkDelete when the delete button is clicked', () => {
        const handleBulkDelete = vi.fn();
        render(
            <BulkActionBar
                selectedCount={2}
                onBulkDelete={handleBulkDelete}
                isDeleting={false}
            />,
        );

        fireEvent.click(screen.getByText('Delete Selected'));

        expect(handleBulkDelete).toHaveBeenCalledTimes(1);
    });

    test('shows a loading label and disables the button while deleting', () => {
        render(
            <BulkActionBar
                selectedCount={2}
                onBulkDelete={vi.fn()}
                isDeleting={true}
            />,
        );

        expect(screen.getByText('Removing...')).toBeDisabled();
    });

    test('clears the selection when Clear is clicked', () => {
        const handleClear = vi.fn();
        render(
            <BulkActionBar
                selectedCount={2}
                onBulkDelete={vi.fn()}
                onClear={handleClear}
                isDeleting={false}
            />,
        );

        fireEvent.click(screen.getByLabelText('Clear'));

        expect(handleClear).toHaveBeenCalledTimes(1);
    });

    test('clears the selection when Escape is pressed', () => {
        const handleClear = vi.fn();
        render(
            <BulkActionBar
                selectedCount={2}
                onBulkDelete={vi.fn()}
                onClear={handleClear}
                isDeleting={false}
            />,
        );

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(handleClear).toHaveBeenCalledTimes(1);
    });

    test('stays mounted while animating out, then unmounts', async () => {
        const props = { onBulkDelete: vi.fn(), isDeleting: false };
        const { rerender } = render(
            <BulkActionBar selectedCount={2} {...props} />,
        );

        rerender(<BulkActionBar selectedCount={0} {...props} />);

        expect(screen.getByRole('toolbar')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();

        await waitFor(() =>
            expect(screen.queryByRole('toolbar')).not.toBeInTheDocument(),
        );
    });
});
