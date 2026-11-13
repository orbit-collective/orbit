import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { NotificationFilter } from '@/types/Notification';
import { cn } from '@/utils/cn';
import { SPRING } from '@/utils/motion';

const TABS: NotificationFilter[] = [
    'all',
    'success',
    'info',
    'warning',
    'error',
];

interface NotificationFilterTabsProps {
    activeFilter: NotificationFilter;
    onChange: (filter: NotificationFilter) => void;
}

function NotificationFilterTabs({
    activeFilter,
    onChange,
}: NotificationFilterTabsProps) {
    const { t } = useLaravelReactI18n();
    return (
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-(--bg-light-color) p-1">
            {TABS.map((tab) => (
                <button
                    key={tab}
                    type="button"
                    onClick={() => onChange(tab)}
                    aria-pressed={activeFilter === tab}
                    className={cn(
                        'relative w-full whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        activeFilter === tab
                            ? 'text-(--bg-dark-color)'
                            : 'text-(--text-gray-color) hover:text-(--text-color)',
                    )}
                >
                    {activeFilter === tab && (
                        <motion.span
                            layoutId="notification-filter"
                            data-testid="notification-filter-pill"
                            className="absolute inset-0 rounded-full bg-(--text-color)"
                            transition={SPRING}
                        />
                    )}
                    <span className="relative">
                        {t(`notification_filter_tabs.${tab}`)}
                    </span>
                </button>
            ))}
        </div>
    );
}

export default NotificationFilterTabs;
