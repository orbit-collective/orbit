import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import { DURATION, EASE } from '@/utils/motion';

interface NotificationSelectionBarProps {
    selectedCount: number;
    totalCount: number;
    /** The most notifications one action may take; shown once it is reached. */
    limit?: number;
    onToggleAll: () => void;
    onMarkAsRead: () => void;
    onDelete: () => void;
    onCancel: () => void;
}

function NotificationSelectionBar({
    selectedCount,
    totalCount,
    limit,
    onToggleAll,
    onMarkAsRead,
    onDelete,
    onCancel,
}: NotificationSelectionBarProps) {
    const { t } = useLaravelReactI18n();
    const allSelected = totalCount > 0 && selectedCount === totalCount;
    const hasSelection = selectedCount > 0;

    return (
        <motion.div
            role="toolbar"
            aria-label={t('notification_selection_bar.aria')}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{
                opacity: 0,
                height: 0,
                marginTop: 0,
                transition: { duration: DURATION.fast },
            }}
            transition={{ duration: DURATION.base, ease: EASE }}
            className="flex flex-wrap items-center gap-2 overflow-hidden rounded-xl bg-(--bg-light-color) px-3 py-2"
        >
            <button
                type="button"
                onClick={onToggleAll}
                disabled={totalCount === 0}
                className="text-xs font-semibold text-(--text-color) hover:underline disabled:opacity-40"
            >
                {allSelected
                    ? t('notification_selection_bar.clear')
                    : t('notification_selection_bar.select_all')}
            </button>
            <span className="text-xs text-(--text-gray-color)">
                {t('notification_selection_bar.selected', {
                    count: selectedCount,
                })}
                {limit !== undefined &&
                    selectedCount >= limit &&
                    t('notification_selection_bar.max')}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
                <Button
                    type="button"
                    onClick={onMarkAsRead}
                    isDisabled={!hasSelection}
                    className="h-8 rounded-lg px-2.5 text-xs"
                >
                    <Icon name="CheckCheck" size={13} />
                    {t('notification_selection_bar.mark_read')}
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    onClick={onDelete}
                    isDisabled={!hasSelection}
                    className="h-8 rounded-lg px-2.5 text-xs"
                >
                    <Icon name="Trash" size={13} />
                    {t('notification_selection_bar.delete')}
                </Button>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label={t('notification_selection_bar.cancel')}
                    title={t('notification_selection_bar.cancel')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-(--text-gray-color) hover:text-(--text-color)"
                >
                    <Icon name="X" size={14} />
                </button>
            </div>
        </motion.div>
    );
}

export default NotificationSelectionBar;
