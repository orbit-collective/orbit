import { AlertProvider } from '@/context/AlertContext';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsDeleteAccountModal from './AccountSettingsDeleteAccountModal';

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
    };
});

const renderModal = (onClose = vi.fn()) => {
    render(
        <AlertProvider>
            <AccountSettingsDeleteAccountModal isOpen onClose={onClose} />
        </AlertProvider>,
    );
    return onClose;
};

describe('AccountSettingsDeleteAccountModal', () => {
    test('renders nothing when closed', () => {
        render(
            <AlertProvider>
                <AccountSettingsDeleteAccountModal
                    isOpen={false}
                    onClose={() => {}}
                />
            </AlertProvider>,
        );

        expect(screen.queryByText('Delete account')).not.toBeInTheDocument();
    });

    test('disables the confirm button until "DELETE" is typed exactly', async () => {
        renderModal();
        const user = userEvent.setup();

        const confirmButton = screen.getByRole('button', {
            name: 'Delete account',
        });
        expect(confirmButton).toBeDisabled();

        await user.type(screen.getByLabelText(/Type/), 'delete');
        expect(confirmButton).toBeDisabled();

        await user.clear(screen.getByLabelText(/Type/));
        await user.type(screen.getByLabelText(/Type/), 'DELETE');
        expect(confirmButton).toBeEnabled();
    });

    test('confirming closes the modal and shows a success alert', async () => {
        const onClose = renderModal();
        const user = userEvent.setup();

        await user.type(screen.getByLabelText(/Type/), 'DELETE');
        await user.click(
            screen.getByRole('button', { name: 'Delete account' }),
        );

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(
            screen.getByText(
                "Account deletion requested — we've emailed you a confirmation link.",
            ),
        ).toBeInTheDocument();
    });
});
