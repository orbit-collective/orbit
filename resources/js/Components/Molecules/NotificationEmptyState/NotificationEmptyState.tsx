import { motion } from 'framer-motion';
import Icon from '@/Components/Atoms/Icon/Icon';
import { SPRING, riseIn } from '@/utils/motion';

interface NotificationEmptyStateProps {
    /** A filter is active, so "nothing here" may just mean "nothing matches". */
    filtered?: boolean;
}

function NotificationEmptyState({
    filtered = false,
}: NotificationEmptyStateProps) {
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
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-light-color)]"
            >
                <Icon
                    name="BellOff"
                    size={18}
                    className="text-[var(--text-muted-color)]"
                />
            </motion.span>
            <p className="text-xs font-medium text-[var(--text-muted-color)]">
                {filtered
                    ? 'No notifications match these filters'
                    : 'No notifications to display'}
            </p>
        </motion.div>
    );
}

export default NotificationEmptyState;
