import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { icons } from 'lucide-react';
import {
    FC,
    PointerEvent as ReactPointerEvent,
    ReactNode,
    useRef,
} from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { DashboardWidget } from '@/types/Dashboard';
import { cn } from '@/utils/cn';
import {
    GRID_COLUMNS,
    GRID_ITEM_CLASS,
    ROW_HEIGHT,
    gridItemStyle,
    sizeAfterResize,
} from '@/utils/dashboardLayout';

interface WidgetSize {
    width: number;
    height: number;
}

interface WidgetEditFrameProps {
    widget: DashboardWidget;
    label: string;
    icon: keyof typeof icons;
    minWidth: number;
    minHeight: number;
    /** Resizing lands on the coarse grid instead of every column and row. */
    snap: boolean;
    selected: boolean;
    onSelect: () => void;
    onToggleVisible: () => void;
    onResize: (size: WidgetSize) => void;
    children?: ReactNode;
}

/** Which way an edge or the corner of the frame resizes it. */
type ResizeAxes = { x: boolean; y: boolean };

const HANDLES: {
    name: string;
    axes: ResizeAxes;
    className: string;
    line: string;
}[] = [
    {
        name: 'width',
        axes: { x: true, y: false },
        className:
            '-right-1.5 top-6 bottom-6 w-3 cursor-ew-resize max-lg:hidden',
        line: 'right-1 top-1/2 h-10 w-1 -translate-y-1/2',
    },
    {
        name: 'height',
        axes: { x: false, y: true },
        className: '-bottom-1.5 left-6 right-6 h-3 cursor-ns-resize',
        line: 'bottom-1 left-1/2 h-1 w-10 -translate-x-1/2',
    },
    {
        name: 'size',
        axes: { x: true, y: true },
        className:
            '-bottom-1.5 -right-1.5 h-5 w-5 cursor-nwse-resize max-lg:cursor-ns-resize',
        line: '',
    },
];

/**
 * Wraps a widget while the dashboard is being edited. The widget is drawn
 * exactly as on the dashboard, so what you arrange is what you get; a layer
 * on top is the handle to drag it by (mouse and touch), a drop target for
 * another widget and carries a tag with its name and size. The right edge,
 * the bottom edge and the corner resize it, live.
 */
const WidgetEditFrame: FC<WidgetEditFrameProps> = ({
    widget,
    label,
    icon,
    minWidth,
    minHeight,
    snap,
    selected,
    onSelect,
    onToggleVisible,
    onResize,
    children,
}) => {
    const cellRef = useRef<HTMLDivElement | null>(null);
    const {
        listeners,
        setNodeRef: setDragRef,
        setActivatorNodeRef,
        transform,
        isDragging,
    } = useDraggable({ id: widget.id });
    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: widget.id });
    const hidden = !widget.visible;

    const startResize = (
        event: ReactPointerEvent<HTMLElement>,
        axes: ResizeAxes,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        const handle = event.currentTarget;
        handle.setPointerCapture?.(event.pointerId);

        // The grid is the cell's parent; a column is a 120th of its width.
        const grid = cellRef.current?.parentElement;
        const columnPx = grid
            ? Math.max(1, grid.getBoundingClientRect().width / GRID_COLUMNS)
            : 1;
        const origin = {
            x: event.clientX,
            y: event.clientY,
            width: widget.width,
            height: widget.height,
        };

        const move = (moveEvent: PointerEvent) => {
            onResize(
                sizeAfterResize(
                    origin,
                    {
                        columns: axes.x
                            ? (moveEvent.clientX - origin.x) / columnPx
                            : 0,
                        rows: axes.y
                            ? (moveEvent.clientY - origin.y) / ROW_HEIGHT
                            : 0,
                    },
                    { minWidth, minHeight },
                    snap,
                ),
            );
        };
        const stop = () => {
            handle.removeEventListener('pointermove', move);
            handle.removeEventListener('pointerup', stop);
            handle.removeEventListener('pointercancel', stop);
        };

        handle.addEventListener('pointermove', move);
        handle.addEventListener('pointerup', stop);
        handle.addEventListener('pointercancel', stop);
    };

    // The eye must stay clickable inside a header that starts a drag.
    const keepOutOfDrag = {
        onMouseDown: (event: { stopPropagation: () => void }) =>
            event.stopPropagation(),
        onTouchStart: (event: { stopPropagation: () => void }) =>
            event.stopPropagation(),
        onPointerDown: (event: { stopPropagation: () => void }) =>
            event.stopPropagation(),
    };

    return (
        <div
            ref={(node) => {
                cellRef.current = node;
                setDragRef(node);
                setDropRef(node);
            }}
            style={{
                ...gridItemStyle(widget),
                transform: CSS.Translate.toString(transform),
            }}
            data-testid="widget-edit-frame"
            data-widget-id={widget.id}
            className={cn(
                GRID_ITEM_CLASS,
                'p-2.5',
                isDragging && 'relative z-30',
            )}
        >
            <div
                className={cn(
                    'relative h-full',
                    isDragging && 'opacity-90 drop-shadow-2xl',
                )}
            >
                {/* The widget as it is on the dashboard, nothing added to it. */}
                {hidden ? (
                    <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-color-strong)] px-3 text-center text-xs text-[var(--text-muted-color)]">
                        <Icon name="EyeOff" size={18} />
                        <span>Hidden, it will not appear on the dashboard</span>
                    </div>
                ) : (
                    <div className="h-full min-h-0 overflow-hidden [&>*]:h-full">
                        {children}
                    </div>
                )}

                {/* Everything for editing sits on top: the widget is dragged
                    by its whole surface and picked with a click. */}
                <div
                    ref={setActivatorNodeRef}
                    data-testid="widget-drag-surface"
                    title="Drag to move"
                    onClick={onSelect}
                    className={cn(
                        'absolute inset-0 cursor-grab touch-none select-none rounded-xl outline-2 outline-offset-0 transition-[outline-color,background-color] duration-150 active:cursor-grabbing',
                        selected
                            ? 'outline outline-[var(--accent-color)]'
                            : 'outline outline-transparent hover:bg-[var(--accent-color-opacity)] hover:outline-[var(--border-color-strong)]',
                        isOver &&
                            !isDragging &&
                            'bg-[var(--accent-color-opacity)] outline-dashed outline-[var(--accent-color)]',
                    )}
                    {...listeners}
                >
                    <div className="absolute -top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-lg border border-solid border-[var(--border-color-strong)] bg-[var(--bg-color)] py-0.5 pl-1.5 pr-0.5 shadow-md">
                        <Icon
                            name="GripVertical"
                            size={12}
                            color="var(--text-muted-color)"
                        />
                        <Icon
                            name={icon}
                            size={12}
                            color="var(--text-gray-color)"
                        />
                        <span className="min-w-0 truncate text-[11px] font-semibold text-[var(--text-color)]">
                            {label}
                        </span>
                        <span
                            data-testid="widget-size"
                            className="hidden shrink-0 text-[10px] font-medium tabular-nums text-[var(--text-muted-color)] sm:inline"
                        >
                            {Math.round((widget.width / GRID_COLUMNS) * 100)}% ·{' '}
                            {widget.height * ROW_HEIGHT}px
                        </span>
                        <button
                            type="button"
                            aria-label={
                                hidden ? `Show ${label}` : `Hide ${label}`
                            }
                            title={hidden ? 'Show' : 'Hide'}
                            onClick={(event) => {
                                event.stopPropagation();
                                onToggleVisible();
                            }}
                            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                            {...keepOutOfDrag}
                        >
                            <Icon name={hidden ? 'EyeOff' : 'Eye'} size={12} />
                        </button>
                    </div>

                    {HANDLES.map((handle) => (
                        <div
                            key={handle.name}
                            role="separator"
                            aria-orientation={
                                handle.name === 'height'
                                    ? 'horizontal'
                                    : 'vertical'
                            }
                            aria-label={`Resize ${label}, ${handle.name}`}
                            data-testid={`resize-${handle.name}`}
                            onPointerDown={(event) =>
                                startResize(event, handle.axes)
                            }
                            onClick={(event) => event.stopPropagation()}
                            className={cn(
                                'group/handle absolute z-10 touch-none',
                                handle.className,
                            )}
                        >
                            {handle.line ? (
                                <span
                                    aria-hidden="true"
                                    className={cn(
                                        'absolute rounded-full bg-[var(--accent-color)] opacity-0 transition-opacity group-hover/handle:opacity-100',
                                        handle.line,
                                    )}
                                />
                            ) : (
                                <svg
                                    aria-hidden="true"
                                    viewBox="0 0 12 12"
                                    className="absolute bottom-1 right-1 h-3 w-3 text-[var(--text-gray-color)] transition-colors group-hover/handle:text-[var(--accent-color)]"
                                >
                                    <path
                                        d="M11 5 5 11M11 8l-3 3"
                                        stroke="currentColor"
                                        strokeWidth="1.4"
                                        strokeLinecap="round"
                                        fill="none"
                                    />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WidgetEditFrame;
