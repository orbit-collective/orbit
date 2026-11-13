import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Icon from '@/Components/Atoms/Icon/Icon';
import { SPRING, riseIn } from '@/utils/motion';

interface NotificationEmptyStateProps {
    /** A filter is active, so "nothing here" may just mean "nothing matches". */
    filtered?: boolean;
}

function NotificationEmptyState({
    filtered = false,
}: NotificationEmptyStateProps) {
    const { t } = useLaravelReactI18n();
    return (
        <motion.div
            variants={riseIn}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-3 py-14 text-center"
        >
            <motion.span
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...SPRING, delay: 0.1 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--bg-light-color)"
            >
                <Icon
                    name="BellOff"
                    size={18}
                    className="text-(--text-muted-color)"
                />
            </motion.span>
            <p className="text-xs font-medium text-(--text-muted-color)">
                {filtered
                    ? t('notification_empty_state.filtered')
                    : t('notification_empty_state.empty')}
            </p>
        </motion.div>
    );
}

export default NotificationEmptyState;
