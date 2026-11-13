import {
    DndContext,
    DragEndEvent,
    MouseSensor,
    TouchSensor,
    pointerWithin,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { AnimatePresence } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC } from 'react';
import { PageSection } from '@/Components/Atoms/PageStage/PageStage';
import WidgetEditFrame from '@/Components/Molecules/WidgetEditFrame/WidgetEditFrame';
import DashboardWidget, {
    DashboardData,
} from '@/Components/Organisms/DashboardWidget/DashboardWidget';
import {
    DashboardCatalogEntry,
    DashboardWidget as Widget,
} from '@/types/Dashboard';
import {
    GRID_CLASS,
    GRID_ITEM_CLASS,
    gridItemStyle,
    widgetLabel,
} from '@/utils/dashboardLayout';

interface DashboardGridProps {
    widgets: Widget[];
    catalog: DashboardCatalogEntry[];
    data: DashboardData;
    editing?: boolean;
    /** Resizing lands on the coarse grid instead of every column and row. */
    snap?: boolean;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    onReorder?: (fromId: string, toId: string) => void;
    onResize?: (id: string, size: { width: number; height: number }) => void;
    onToggleVisible?: (id: string) => void;
}

/**
 * The widgets of the dashboard on a fine grid: 120 columns wide, rows of a few
 * pixels, so a widget can take any size. While editing, every widget (hidden
 * ones too) is dragged by its header onto another to take its place, and
 * resized by its edges.
 */
const DashboardGrid: FC<DashboardGridProps> = ({
    widgets,
    catalog,
    data,
    editing = false,
    snap = true,
    selectedId = null,
    onSelect,
    onReorder,
    onResize,
    onToggleVisible,
}) => {
    const { t } = useLaravelReactI18n();
    // A small drag distance keeps a plain click a click; on touch a drag takes a
    // press and hold, so a swipe over a widget still scrolls the page.
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 250, tolerance: 5 },
        }),
    );

    if (!editing) {
        return (
            <div className={GRID_CLASS}>
                {widgets
                    .filter((widget) => widget.visible)
                    .map((widget) => (
                        <PageSection
                            key={widget.id}
                            className={`${GRID_ITEM_CLASS} p-2.5`}
                            style={gridItemStyle(widget)}
                        >
                            <div className="h-full min-h-0 overflow-auto *:h-full">
                                <DashboardWidget widget={widget} data={data} />
                            </div>
                        </PageSection>
                    ))}
            </div>
        );
    }

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (over && active.id !== over.id) {
            onReorder?.(String(active.id), String(over.id));
        }
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragEnd={handleDragEnd}
        >
            <div className={GRID_CLASS}>
                {/* No entrance for what is already there when editing starts. */}
                <AnimatePresence initial={false}>
                    {widgets.map((widget, index) => {
                        const entry = catalog.find(
                            (item) => item.type === widget.type,
                        );

                        return (
                            <WidgetEditFrame
                                key={widget.id}
                                widget={widget}
                                label={widgetLabel(widget, entry, t)}
                                icon={entry?.icon ?? 'LayoutDashboard'}
                                minWidth={entry?.minWidth ?? 20}
                                minHeight={entry?.minHeight ?? 20}
                                snap={snap}
                                selected={widget.id === selectedId}
                                onSelect={() => onSelect?.(widget.id)}
                                onToggleVisible={() =>
                                    onToggleVisible?.(widget.id)
                                }
                                onResize={(size) => onResize?.(widget.id, size)}
                                index={index}
                            >
                                <DashboardWidget widget={widget} data={data} />
                            </WidgetEditFrame>
                        );
                    })}
                </AnimatePresence>
            </div>
        </DndContext>
    );
};

export default DashboardGrid;
