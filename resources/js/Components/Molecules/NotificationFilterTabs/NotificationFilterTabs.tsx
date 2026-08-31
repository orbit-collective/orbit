import { NotificationFilter } from '@/types/Notification';
import { cn } from '@/utils/cn';

const TABS: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'success', label: 'Success' },
    { id: 'info', label: 'Info' },
    { id: 'warning', label: 'Warning' },
    { id: 'error', label: 'Error' },
];

interface NotificationFilterTabsProps {
    activeFilter: NotificationFilter;
    onChange: (filter: NotificationFilter) => void;
}

function NotificationFilterTabs({
    activeFilter,
    onChange,
}: NotificationFilterTabsProps) {
    return (
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-full bg-[var(--bg-light-color)] p-1">
            {TABS.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => onChange(tab.id)}
                    aria-pressed={activeFilter === tab.id}
                    className={cn(
                        'w-full whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                        activeFilter === tab.id
                            ? 'bg-[var(--text-color)] text-[var(--bg-dark-color)]'
                            : 'text-[var(--text-gray-color)] hover:text-[var(--text-color)]',
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default NotificationFilterTabs;
