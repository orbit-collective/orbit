import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';

interface NotificationSelectionBarProps {
    selectedCount: number;
    totalCount: number;
    onToggleAll: () => void;
    onMarkAsRead: () => void;
    onDelete: () => void;
    onCancel: () => void;
}

function NotificationSelectionBar({
    selectedCount,
    totalCount,
    onToggleAll,
    onMarkAsRead,
    onDelete,
    onCancel,
}: NotificationSelectionBarProps) {
    const allSelected = totalCount > 0 && selectedCount === totalCount;
    const hasSelection = selectedCount > 0;

    return (
        <div
            role="toolbar"
            aria-label="Selection actions"
            className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--bg-light-color)] px-3 py-2"
        >
            <button
                type="button"
                onClick={onToggleAll}
                disabled={totalCount === 0}
                className="text-xs font-semibold text-[var(--text-color)] hover:underline disabled:opacity-40"
            >
                {allSelected ? 'Clear selection' : 'Select all'}
            </button>
            <span className="text-xs text-[var(--text-gray-color)]">
                {selectedCount} selected
            </span>

            <div className="ml-auto flex items-center gap-1.5">
                <Button
                    type="button"
                    onClick={onMarkAsRead}
                    isDisabled={!hasSelection}
                    className="h-8 rounded-lg px-2.5 text-xs"
                >
                    <Icon name="CheckCheck" size={13} />
                    Mark read
                </Button>
                <Button
                    type="button"
                    variant="danger"
                    onClick={onDelete}
                    isDisabled={!hasSelection}
                    className="h-8 rounded-lg px-2.5 text-xs"
                >
                    <Icon name="Trash" size={13} />
                    Delete
                </Button>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Cancel selection"
                    title="Cancel selection"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                >
                    <Icon name="X" size={14} />
                </button>
            </div>
        </div>
    );
}

export default NotificationSelectionBar;
