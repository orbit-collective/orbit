import { FC, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Badge from '@/Components/Atoms/Badge/Badge';
import Button from '@/Components/Atoms/Button/Button';
import Divider from '@/Components/Atoms/Divider/Divider';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { BulkActionBarProps } from '@/types/Components';

export const BulkActionBar: FC<BulkActionBarProps> = ({
    selectedCount,
    onBulkDelete,
    onClear,
    isDeleting,
}) => {
    const isVisible = selectedCount > 0;

    useEffect(() => {
        if (!isVisible || !onClear) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClear();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onClear]);

    if (!isVisible) return null;

    return createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div
                role="toolbar"
                aria-label="Bulk actions"
                className="animate-in fade-in slide-in-from-bottom-4 bg-[var(--bg-color)]/85 pointer-events-auto flex items-center gap-1 rounded-2xl  p-1.5 backdrop-blur-xl duration-200"
            >
                <div className="flex items-center gap-2.5 rounded-xl bg-[var(--accent-color-opacity)] py-1.5 pl-1.5 pr-3.5">
                    <Badge className="h-7 min-w-7 rounded-lg border-transparent bg-[var(--accent-color)] px-1.5 text-xs font-bold tabular-nums text-white">
                        {selectedCount}
                    </Badge>
                    <span className="whitespace-nowrap text-sm font-medium text-[var(--text-color)]">
                        {selectedCount === 1 ? 'issue' : 'issues'} selected
                    </span>
                </div>

                <Button
                    type="button"
                    variant="danger"
                    onClick={onBulkDelete}
                    isDisabled={isDeleting}
                    className="ml-1 h-10 rounded-xl px-4 active:scale-95"
                >
                    <Icon name="Trash" size={15} />
                    {isDeleting ? 'Removing...' : 'Delete Selected'}
                </Button>

                {onClear && (
                    <>
                        <Divider orientation="vertical" className="mx-1" />
                        <IconButton
                            type="button"
                            iconName="X"
                            iconSize={15}
                            ariaLabel="Clear"
                            onClick={onClear}
                            disabled={isDeleting}
                            className="h-10 gap-2 rounded-xl px-3 text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                        >
                            <Keybind
                                tooltipText="Clear selection"
                                keybind="Esc"
                            />
                        </IconButton>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default BulkActionBar;
