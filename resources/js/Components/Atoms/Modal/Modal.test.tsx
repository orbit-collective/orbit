import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import Modal from './Modal';

describe('Modal Component', () => {
    const noop = () => {};

    test('renders nothing when isOpen is false', () => {
        render(
            <Modal isOpen={false} onClose={noop}>
                <p>Body content</p>
            </Modal>,
        );

        expect(screen.queryByText('Body content')).not.toBeInTheDocument();
    });

    test('renders its children when isOpen is true', () => {
        render(
            <Modal isOpen onClose={noop}>
                <p>Body content</p>
            </Modal>,
        );

        expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    test('calls onClose when the backdrop is clicked', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen onClose={handleClose}>
                <p>Body content</p>
            </Modal>,
        );

        // The backdrop is the parent of the panel that wraps the children.
        const backdrop = screen.getByText('Body content').parentElement
            ?.parentElement as HTMLElement;
        await userEvent.click(backdrop);

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('calls onClose when Escape is pressed', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen onClose={handleClose}>
                <p>Body content</p>
            </Modal>,
        );

        await userEvent.keyboard('{Escape}');

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('Escape in a field with an open suggestion list is left to that field', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen onClose={handleClose}>
                <input aria-label="Search" aria-activedescendant="option-1" />
            </Modal>,
        );

        screen.getByLabelText('Search').focus();
        await userEvent.keyboard('{Escape}');

        expect(handleClose).not.toHaveBeenCalled();
    });

    test('Escape in a field without an open list still closes it', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen onClose={handleClose}>
                <input aria-label="Search" />
            </Modal>,
        );

        screen.getByLabelText('Search').focus();
        await userEvent.keyboard('{Escape}');

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('Escape closes the modal again once the list has closed', async () => {
        const handleClose = vi.fn();
        const { rerender } = render(
            <Modal isOpen onClose={handleClose}>
                <input aria-label="Search" aria-activedescendant="option-1" />
            </Modal>,
        );

        screen.getByLabelText('Search').focus();
        await userEvent.keyboard('{Escape}');
        expect(handleClose).not.toHaveBeenCalled();

        rerender(
            <Modal isOpen onClose={handleClose}>
                <input aria-label="Search" />
            </Modal>,
        );
        await userEvent.keyboard('{Escape}');

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test('does not call onClose when the panel content is clicked', async () => {
        const handleClose = vi.fn();
        render(
            <Modal isOpen onClose={handleClose}>
                <p>Body content</p>
            </Modal>,
        );

        await userEvent.click(screen.getByText('Body content'));

        expect(handleClose).not.toHaveBeenCalled();
    });

    test('applies the medium max-width by default', () => {
        render(
            <Modal isOpen onClose={noop}>
                <p>Body content</p>
            </Modal>,
        );

        const panel = screen.getByText('Body content').parentElement;
        expect(panel).toHaveClass('max-w-3xl');
    });

    test.each([
        ['sm', 'max-w-lg'],
        ['md', 'max-w-3xl'],
        ['lg', 'max-w-5xl'],
    ] as const)('applies the correct max-width for size "%s"', (size, cls) => {
        render(
            <Modal isOpen onClose={noop} size={size}>
                <p>Body content</p>
            </Modal>,
        );

        expect(screen.getByText('Body content').parentElement).toHaveClass(cls);
    });
});
