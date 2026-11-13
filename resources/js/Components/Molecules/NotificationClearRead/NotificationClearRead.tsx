import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';

interface NotificationClearReadProps {
    onConfirm: () => void;
}

/** "Delete all read" with an inline second step, since it cannot be undone. */
function NotificationClearRead({ onConfirm }: NotificationClearReadProps) {
    const { t } = useLaravelReactI18n();
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isConfirming) {
        return (
            <button
                type="button"
                onClick={() => setIsConfirming(true)}
                className="text-xs font-medium text-(--text-gray-color) hover:text-(--text-color) hover:underline"
            >
                {t('notification_clear_read.delete_all')}
            </button>
        );
    }

    return (
        <span className="flex items-center gap-2 text-xs">
            <span className="text-(--text-gray-color)">
                {t('notification_clear_read.confirm')}
            </span>
            <button
                type="button"
                onClick={() => {
                    setIsConfirming(false);
                    onConfirm();
                }}
                className="font-semibold text-(--error-color) hover:underline"
            >
                {t('notification_clear_read.delete')}
            </button>
            <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="font-medium text-(--text-gray-color) hover:underline"
            >
                {t('notification_clear_read.cancel')}
            </button>
        </span>
    );
}

export default NotificationClearRead;
