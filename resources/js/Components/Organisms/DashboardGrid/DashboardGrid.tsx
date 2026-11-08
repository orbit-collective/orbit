import {
    DndContext,
    DragEndEvent,
    MouseSensor,
    TouchSensor,
    pointerWithin,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
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
import { spanClass } from '@/utils/dashboardLayout';

interface DashboardGridProps {
    widgets: Widget[];
    catalog: DashboardCatalogEntry[];
    data: DashboardData;
    editing?: boolean;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    onReorder?: (fromId: string, toId: string) => void;
    onMove?: (id: string, delta: -1 | 1) => void;
    onToggleVisible?: (id: string) => void;
}

/**
 * The widgets of the dashboard on a twelve column grid. While editing, every
 * widget (hidden ones too) is a drag handle and a drop target; dropping one on
 * another puts it in that place.
 */
const DashboardGrid: FC<DashboardGridProps> = ({
    widgets,
    catalog,
    data,
    editing = false,
    selectedId = null,
    onSelect,
    onReorder,
    onMove,
    onToggleVisible,
}) => {
    // A small drag distance keeps a plain tap a tap, on touch as on mouse.
    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 120, tolerance: 8 },
        }),
    );

    if (!editing) {
        return (
            <div className="grid grid-cols-12 gap-5">
                {widgets
                    .filter((widget) => widget.visible)
                    .map((widget) => (
                        <PageSection
                            key={widget.id}
                            className={`flex min-w-0 flex-col [&>*]:flex-1 ${spanClass(widget.span)}`}
                        >
                            <DashboardWidget widget={widget} data={data} />
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
            <div className="grid grid-cols-12 gap-5">
                {widgets.map((widget, index) => (
                    <WidgetEditFrame
                        key={widget.id}
                        id={widget.id}
                        label={
                            catalog.find((entry) => entry.type === widget.type)
                                ?.label ?? widget.type
                        }
                        hidden={!widget.visible}
                        selected={widget.id === selectedId}
                        canMoveUp={index > 0}
                        canMoveDown={index < widgets.length - 1}
                        onSelect={() => onSelect?.(widget.id)}
                        onMove={(delta) => onMove?.(widget.id, delta)}
                        onToggleVisible={() => onToggleVisible?.(widget.id)}
                        className={spanClass(widget.span)}
                    >
                        <DashboardWidget widget={widget} data={data} />
                    </WidgetEditFrame>
                ))}
            </div>
        </DndContext>
    );
};

export default DashboardGrid;
