import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FC, ReactNode } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { cn } from '@/utils/cn';

interface WidgetEditFrameProps {
    id: string;
    label: string;
    /** Hidden widgets show a stand-in instead of their content. */
    hidden: boolean;
    selected: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onSelect: () => void;
    onMove: (delta: -1 | 1) => void;
    onToggleVisible: () => void;
    className?: string;
    children?: ReactNode;
}

/**
 * Wraps a widget while the dashboard is being edited: a handle to drag it by
 * (mouse and touch), buttons that do the same without dragging, and a
 * drop target so another widget can be dropped on it.
 */
const WidgetEditFrame: FC<WidgetEditFrameProps> = ({
    id,
    label,
    hidden,
    selected,
    canMoveUp,
    canMoveDown,
    onSelect,
    onMove,
    onToggleVisible,
    className,
    children,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        setActivatorNodeRef,
        transform,
        isDragging,
    } = useDraggable({ id });
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id });

    return (
        <div
            ref={(node) => {
                setDragRef(node);
                setDropRef(node);
            }}
            style={{ transform: CSS.Translate.toString(transform) }}
            data-testid="widget-edit-frame"
            data-widget-id={id}
            onClick={onSelect}
            className={cn(
                'relative min-w-0 rounded-xl outline outline-2 outline-offset-2 outline-transparent transition-[outline-color]',
                selected && 'outline-[var(--accent-color)]',
                isOver &&
                    !isDragging &&
                    'outline-dashed outline-[var(--accent-color)]',
                isDragging && 'z-30 opacity-80 shadow-2xl',
                className,
            )}
        >
            <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-1 rounded-t-xl border-b border-solid border-[var(--border-color)] bg-[var(--bg-color)] px-1.5 py-1">
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    aria-label={`Drag ${label}`}
                    title="Drag to move"
                    className="flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border-none bg-transparent text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] active:cursor-grabbing"
                    {...attributes}
                    {...listeners}
                >
                    <Icon name="GripVertical" size={16} />
                </button>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-gray-color)]">
                    {label}
                </span>
                <div
                    className="flex shrink-0 items-center"
                    onClick={(event) => event.stopPropagation()}
                >
                    <IconButton
                        type="button"
                        iconName="ChevronUp"
                        ariaLabel={`Move ${label} up`}
                        disabled={!canMoveUp}
                        onClick={() => onMove(-1)}
                    />
                    <IconButton
                        type="button"
                        iconName="ChevronDown"
                        ariaLabel={`Move ${label} down`}
                        disabled={!canMoveDown}
                        onClick={() => onMove(1)}
                    />
                    <IconButton
                        type="button"
                        iconName={hidden ? 'EyeOff' : 'Eye'}
                        ariaLabel={hidden ? `Show ${label}` : `Hide ${label}`}
                        onClick={onToggleVisible}
                    />
                </div>
            </div>
            {hidden ? (
                <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--border-color-strong)] px-3 pt-9 text-xs text-[var(--text-muted-color)]">
                    Hidden, it will not appear on the dashboard
                </div>
            ) : (
                <div className="pointer-events-none select-none pt-9">
                    {children}
                </div>
            )}
        </div>
    );
};

export default WidgetEditFrame;
