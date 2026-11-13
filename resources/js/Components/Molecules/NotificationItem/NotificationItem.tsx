import { AnimatePresence, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { Notification, NotificationTypes } from '@/types/Notification';
import { cn } from '@/utils/cn';
import { SPRING } from '@/utils/motion';
import { formatShortDate, intlLocale } from '@/utils/time';

interface NotificationItemProps {
    notification: Notification;
    onMarkAsRead: (id: number) => void;
    onRemove: (id: number) => void;
    /** Selection mode: a checkbox replaces the delete button. */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: (id: number) => void;
}

const DOT_COLOR_CLASSES: Record<NotificationTypes, string> = {
    success: 'bg-(--success-color)',
    info: 'bg-(--info-color)',
    warning: 'bg-(--warning-color)',
    error: 'bg-(--error-color)',
};

function NotificationItem({
    notification,
    onMarkAsRead,
    onRemove,
    selectable = false,
    selected = false,
    onToggleSelect,
}: NotificationItemProps) {
    const { t, currentLocale } = useLaravelReactI18n();
    return (
        <div
            className={cn(
                'group px-1 py-3 transition-colors duration-200',
                selected && 'bg-(--bg-light-color)/40',
            )}
        >
            <div className="flex items-center justify-between gap-2">
                <div className={'flex items-center gap-2'}>
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={SPRING}
                        className={`h-1.5 w-1.5 shrink-0 rounded-[3px] ${DOT_COLOR_CLASSES[notification.type]}`}
                    />
                    <h2 className="truncate text-sm text-(--text-gray-color)">
                        {notification.title}
                    </h2>
                </div>
                {selectable ? (
                    <Checkbox
                        id={`notification-select-${notification.id}`}
                        checked={selected}
                        onChange={() => onToggleSelect?.(notification.id)}
                        label={
                            <span className="sr-only">
                                {t('notification_item.select', {
                                    title: notification.title,
                                })}
                            </span>
                        }
                        className="p-2"
                    />
                ) : (
                    <IconButton
                        iconName={'Trash'}
                        iconSize={12}
                        ariaLabel={t('notification_item.delete')}
                        onClick={() => onRemove(notification.id)}
                    />
                )}
            </div>

            <div className="pl-3.5">
                {notification.message && (
                    <p className="mt-1.5 text-sm leading-relaxed font-medium wrap-break-word text-(--text-color)">
                        {notification.message}
                    </p>
                )}

                <div className="mt-2 flex items-center gap-1.5 text-xs text-(--text-muted-color)">
                    <Icon name="Calendar" size={12} />
                    <span>
                        {formatShortDate(
                            notification.created_at,
                            intlLocale(currentLocale()),
                        )}
                    </span>
                    <span>&bull;</span>
                    <AnimatePresence mode="wait" initial={false}>
                        {notification.read ? (
                            <motion.span
                                key="read"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={SPRING}
                                className="flex items-center gap-1 font-medium text-(--success-color)"
                            >
                                <Icon name="CircleCheck" size={12} />
                                {t('notification_item.read')}
                            </motion.span>
                        ) : (
                            <motion.button
                                key="unread"
                                type="button"
                                onClick={() => onMarkAsRead(notification.id)}
                                title={t('notification_item.mark_as_read')}
                                exit={{ opacity: 0, scale: 0.8 }}
                                transition={{ duration: 0.12 }}
                                className="flex cursor-pointer items-center gap-1 font-medium text-(--info-color) hover:underline"
                            >
                                <Icon name="Clock" size={12} />
                                {t('notification_item.unread')}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {notification.action_url && (
                    <div className="mt-2.5">
                        <a
                            href={notification.action_url}
                            className="text-xs font-medium text-(--accent-color) hover:underline"
                        >
                            {t('notification_item.view_details')}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}

export default NotificationItem;
