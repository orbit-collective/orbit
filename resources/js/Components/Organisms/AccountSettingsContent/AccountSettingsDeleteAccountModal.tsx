import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';

const CONFIRM_PHRASE = 'DELETE';

interface AccountSettingsDeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AccountSettingsDeleteAccountModal({
    isOpen,
    onClose,
}: AccountSettingsDeleteAccountModalProps) {
    const { t } = useLaravelReactI18n();
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

        router.delete(route('account.delete'), {
            preserveScroll: true,
            onSuccess: () => {
                addAlert(
                    t('account_settings.delete_account.deleted'),
                    'success',
                );
            },
            onError: () => {
                addAlert(t('account_settings.delete_account.failed'), 'error');
            },
            onFinish: () => {
                handleClose();
            },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader
                title={t('account_settings.delete_account.title')}
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--error-color)/10 text-(--error-color)">
                        <Icon name="TriangleExclamationPoint" size={16} />
                    </span>
                }
            />

            <div className="space-y-4 px-6 py-5">
                <p className="text-sm text-(--text-gray-color)">
                    {t('account_settings.delete_account.warning')}
                </p>
                <ul className="space-y-1.5 text-sm text-(--text-gray-color)">
                    <li className="flex items-start gap-2">
                        <Icon
                            name="X"
                            size={13}
                            className="mt-0.5 shrink-0 text-(--error-color)"
                        />
                        {t(
                            'account_settings.delete_account.consequence_access',
                        )}
                    </li>
                    <li className="flex items-start gap-2">
                        <Icon
                            name="X"
                            size={13}
                            className="mt-0.5 shrink-0 text-(--error-color)"
                        />
                        {t(
                            'account_settings.delete_account.consequence_content',
                        )}
                    </li>
                </ul>

                <div className="space-y-1.5">
                    <label
                        htmlFor="delete-confirm"
                        className="text-sm font-medium text-(--text-color)"
                    >
                        {t('account_settings.delete_account.type_prefix')}{' '}
                        <span className="font-semibold text-(--error-color)">
                            {CONFIRM_PHRASE}
                        </span>{' '}
                        {t('account_settings.delete_account.type_suffix')}
                    </label>
                    <Input
                        id="delete-confirm"
                        value={confirmText}
                        onChange={(event) => setConfirmText(event.target.value)}
                        placeholder={CONFIRM_PHRASE}
                    />
                </div>
            </div>

            <footer className="flex items-center justify-end gap-3 border-t border-(--bg-light-color) px-6 py-4">
                <button
                    type="button"
                    onClick={handleClose}
                    className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-(--text-gray-color) transition-colors duration-150 hover:text-(--text-color)"
                >
                    {t('common.cancel')}
                </button>
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="cursor-pointer rounded-lg bg-(--error-color) px-4 py-2 text-sm font-medium text-(--text-color) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {t('account_settings.delete_account.title')}
                </button>
            </footer>
        </Modal>
    );
}
