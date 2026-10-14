import Icon from '@/Components/Atoms/Icon/Icon';

interface NotificationEmptyStateProps {
    /** A filter is active, so "nothing here" may just mean "nothing matches". */
    filtered?: boolean;
}

function NotificationEmptyState({
    filtered = false,
}: NotificationEmptyStateProps) {
    return (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-light-color)]">
                <Icon
                    name="BellOff"
                    size={18}
                    className="text-[var(--text-muted-color)]"
                />
            </span>
            <p className="text-xs font-medium text-[var(--text-muted-color)]">
                {filtered
                    ? 'No notifications match these filters'
                    : 'No notifications to display'}
            </p>
        </div>
    );
}

export default NotificationEmptyState;
