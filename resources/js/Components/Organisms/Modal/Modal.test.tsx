import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { ModalContent } from '@/types/Modal';
import { ModalOrg } from './Modal';

describe('ModalOrg Component', () => {
    const buildModal = (
        overrides: Partial<ModalContent> = {},
    ): ModalContent => ({
        id: 'modal-1',
        title: 'My Modal',
        description: 'A helpful description',
        children: <p>Modal body content</p>,
        ...overrides,
    });

    test('renders the modal title and description', () => {
        render(<ModalOrg modal={buildModal()} onClose={() => {}} />);

        expect(screen.getByText('My Modal')).toBeInTheDocument();
        expect(screen.getByText('A helpful description')).toBeInTheDocument();
    });

    test('renders the modal children', () => {
        render(<ModalOrg modal={buildModal()} onClose={() => {}} />);

        expect(screen.getByText('Modal body content')).toBeInTheDocument();
    });

    test('omits the description paragraph when none is provided', () => {
        render(
            <ModalOrg
                modal={buildModal({ description: undefined })}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('My Modal')).toBeInTheDocument();
        expect(
            screen.queryByText('A helpful description'),
        ).not.toBeInTheDocument();
    });

    test('calls onClose with the modal id when the header close button is clicked', async () => {
        const handleClose = vi.fn();
        render(<ModalOrg modal={buildModal()} onClose={handleClose} />);

        await userEvent.click(screen.getByRole('button'));

        expect(handleClose).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledWith('modal-1');
    });

    test('calls onClose with the modal id when Escape is pressed', () => {
        const handleClose = vi.fn();
        render(<ModalOrg modal={buildModal()} onClose={handleClose} />);

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(handleClose).toHaveBeenCalledWith('modal-1');
    });

    test('calls onClose with the modal id when the backdrop is clicked', () => {
        const handleClose = vi.fn();
        render(<ModalOrg modal={buildModal()} onClose={handleClose} />);

        const backdrop = screen
            .getByText('Modal body content')
            .closest('.fixed') as HTMLElement;
        fireEvent.click(backdrop);

        expect(handleClose).toHaveBeenCalledWith('modal-1');
    });

    test('does not render the title/description header for the Keyboard Shortcuts modal', () => {
        render(
            <ModalOrg
                modal={buildModal({
                    title: 'Keyboard Shortcuts',
                    description: 'Should not appear',
                    children: <p>Shortcut list</p>,
                })}
                onClose={() => {}}
            />,
        );

        expect(
            screen.queryByText('Keyboard Shortcuts'),
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Should not appear')).not.toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.getByText('Shortcut list')).toBeInTheDocument();
    });

    test('applies body padding for a regular modal but not for the Keyboard Shortcuts modal', () => {
        const { rerender } = render(
            <ModalOrg modal={buildModal()} onClose={() => {}} />,
        );

        expect(
            screen.getByText('Modal body content').parentElement,
        ).toHaveClass('p-6');

        rerender(
            <ModalOrg
                modal={buildModal({
                    title: 'Keyboard Shortcuts',
                    children: <p>Shortcut list</p>,
                })}
                onClose={() => {}}
            />,
        );

        expect(screen.getByText('Shortcut list').parentElement).not.toHaveClass(
            'p-6',
        );
    });
});
