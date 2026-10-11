import { FC, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Badge from '@/Components/Atoms/Badge/Badge';
import Button from '@/Components/Atoms/Button/Button';
import Divider from '@/Components/Atoms/Divider/Divider';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Keybind from '@/Components/Atoms/Keybind/Keybind';
import { BulkActionBarProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const EXIT_DURATION_MS = 320;

export const BulkActionBar: FC<BulkActionBarProps> = ({
    selectedCount,
    onBulkDelete,
    onClear,
    isDeleting,
}) => {
    const isVisible = selectedCount > 0;
    const [isMounted, setIsMounted] = useState(isVisible);
    const [isOpen, setIsOpen] = useState(false);
    // Keeps the last count on screen while the bar animates out.
    const lastCount = useRef(selectedCount);
    if (isVisible) lastCount.current = selectedCount;

    useEffect(() => {
        if (isVisible) {
            setIsMounted(true);
            // Two frames so the closed state paints before transitioning to open.
            let inner = 0;
            const outer = requestAnimationFrame(() => {
                inner = requestAnimationFrame(() => setIsOpen(true));
            });
            return () => {
                cancelAnimationFrame(outer);
                cancelAnimationFrame(inner);
            };
        }

        setIsOpen(false);
        const timeout = setTimeout(() => setIsMounted(false), EXIT_DURATION_MS);
        return () => clearTimeout(timeout);
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible || !onClear) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClear();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, onClear]);

    if (!isMounted) return null;

    const count = lastCount.current;

    return createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
            <div
                role="toolbar"
                aria-label="Bulk actions"
                className={cn(
                    'origin-bottom transform-gpu motion-reduce:transition-none',
                    isOpen
                        ? 'translate-y-0 scale-100 opacity-100 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]'
                        : 'translate-y-8 scale-90 opacity-0 duration-300 ease-[cubic-bezier(0.4,0,0.6,1)]',
                    'transition-[transform,opacity]',
                    'pointer-events-auto flex items-center gap-1 rounded-2xl bg-[var(--bg-color)]/85 p-1.5 backdrop-blur-xl',
                )}
            >
                <div className="flex items-center gap-2.5 rounded-xl bg-[var(--accent-color-opacity)] py-1.5 pl-1.5 pr-3.5">
                    <Badge className="h-7 min-w-7 rounded-lg border-transparent bg-[var(--accent-color)] px-1.5 text-xs font-bold tabular-nums text-white">
                        {count}
                    </Badge>
                    <span className="whitespace-nowrap text-sm font-medium text-[var(--text-color)]">
                        {count === 1 ? 'issue' : 'issues'} selected
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
