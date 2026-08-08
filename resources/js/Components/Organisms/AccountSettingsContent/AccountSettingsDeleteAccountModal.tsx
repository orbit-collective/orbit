import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { useState } from 'react';

const CONFIRM_PHRASE = 'DELETE';

interface AccountSettingsDeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AccountSettingsDeleteAccountModal({
    isOpen,
    onClose,
}: AccountSettingsDeleteAccountModalProps) {
    const { addAlert } = useAlert();
    const [confirmText, setConfirmText] = useState('');

    const canConfirm = confirmText === CONFIRM_PHRASE;

    const handleClose = () => {
        setConfirmText('');
        onClose();
    };

    const handleConfirm = () => {
        if (!canConfirm) {
            return;
        }

        addAlert(
            "Account deletion requested — we've emailed you a confirmation link.",
            'success',
        );
        handleClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader
                title="Delete account"
                onClose={handleClose}
                icon={
                    <span className="bg-[var(--error-color)]/10 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--error-color)]">
                        <Icon name="TriangleAlert" size={16} />
                    </span>
                }
            />

            <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-[var(--text-gray-color)]">
                    This permanently deletes your account, profile, and all
                    associated data. This action cannot be undone.
                </p>
                <ul className="space-y-1.5 text-sm text-[var(--text-gray-color)]">
                    <li className="flex items-start gap-2">
                        <Icon
                            name="X"
                            size={13}
                            className="mt-0.5 shrink-0 text-[var(--error-color)]"
                        />
                        You will lose access to every workspace immediately.
                    </li>
                    <li className="flex items-start gap-2">
                        <Icon
                            name="X"
                            size={13}
                            className="mt-0.5 shrink-0 text-[var(--error-color)]"
                        />
                        Issues and comments you authored will remain, credited
                        to a deleted user.
                    </li>
                </ul>

                <div className="space-y-1.5">
                    <label
                        htmlFor="delete-confirm"
                        className="text-sm font-medium text-[var(--text-color)]"
                    >
                        Type{' '}
                        <span className="font-semibold text-[var(--error-color)]">
                            {CONFIRM_PHRASE}
                        </span>{' '}
                        to confirm
                    </label>
                    <Input
                        id="delete-confirm"
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder={CONFIRM_PHRASE}
                    />
                </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-[var(--bg-light-color)] px-6 py-4">
                <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="cursor-pointer rounded-lg bg-[var(--error-color)] px-4 py-2 text-sm font-medium text-[var(--text-color)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Delete account
                </button>
            </footer>
        </Modal>
    );
}
