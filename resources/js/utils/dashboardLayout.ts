import { CSSProperties } from 'react';
import {
    DashboardCatalogEntry,
    DashboardWidget,
    DashboardWidgetConfig,
} from '@/types/Dashboard';

/** Most widgets one dashboard may hold, as on the server. */
export const MAX_DASHBOARD_WIDGETS = 30;

/** The dashboard is this many columns wide; a widget's width is in them. */
export const GRID_COLUMNS = 120;

/** A widget's height is in rows of this many pixels. */
export const ROW_HEIGHT = 4;

/** The tallest a widget may be, in rows. */
const MAX_HEIGHT = 400;

/** With snap on a resize moves by these: a twelfth of the width, 40 pixels. */
const COLUMN_SNAP = 10;
const ROW_SNAP = 10;

/** Quick widths offered next to dragging an edge. */
export const WIDTH_PRESETS = [
    { width: 30, label: '1/4' },
    { width: 40, label: '1/3' },
    { width: 60, label: '1/2' },
    { width: 80, label: '2/3' },
    { width: 120, label: 'Full' },
];

/**
 * Classes of the cell a widget sits in: the full width on a narrow screen,
 * `--widget-width` columns from `lg` on, always `--widget-height` rows.
 */
export const GRID_ITEM_CLASS =
    'min-w-0 [grid-column:1/-1] [grid-row:span_var(--widget-height)] lg:[grid-column:span_var(--widget-width)]';

/** The grid the cells sit on: rows of a few pixels, packed densely. */
export const GRID_CLASS =
    '-m-2.5 grid auto-rows-[4px] grid-cols-1 [grid-auto-flow:dense] lg:grid-cols-[repeat(120,minmax(0,1fr))]';

export const gridItemStyle = (widget: DashboardWidget): CSSProperties =>
    ({
        '--widget-width': widget.width,
        '--widget-height': widget.height,
    }) as CSSProperties;

const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

const snapTo = (value: number, step: number) => Math.round(value / step) * step;

/**
 * The size a widget has after one of its edges was dragged by a number of
 * columns and rows. With snap on it lands on the coarse grid (never below the
 * type's minimum); without it every column and row counts.
 */
export function sizeAfterResize(
    start: { width: number; height: number },
    delta: { columns: number; rows: number },
    entry: Pick<DashboardCatalogEntry, 'minWidth' | 'minHeight'>,
    snap: boolean,
): { width: number; height: number } {
    const width = start.width + delta.columns;
    const height = start.height + delta.rows;

    return {
        width: clamp(
            snap ? snapTo(width, COLUMN_SNAP) : Math.round(width),
            entry.minWidth,
            GRID_COLUMNS,
        ),
        height: clamp(
            snap ? snapTo(height, ROW_SNAP) : Math.round(height),
            entry.minHeight,
            MAX_HEIGHT,
        ),
    };
}

/** Move the widget `fromId` to where `toId` is, the others shift by one. */
export function moveWidget(
    widgets: DashboardWidget[],
    fromId: string,
    toId: string,
): DashboardWidget[] {
    const from = widgets.findIndex((widget) => widget.id === fromId);
    const to = widgets.findIndex((widget) => widget.id === toId);

    if (from === -1 || to === -1 || from === to) return widgets;

    const next = [...widgets];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    return next;
}

/** Move a widget one place earlier (-1) or later (1). */
export function shiftWidget(
    widgets: DashboardWidget[],
    id: string,
    delta: -1 | 1,
): DashboardWidget[] {
    const index = widgets.findIndex((widget) => widget.id === id);
    const target = widgets[index + delta];

    return index === -1 || !target
        ? widgets
        : moveWidget(widgets, id, target.id);
}

export const updateWidget = (
    widgets: DashboardWidget[],
    id: string,
    patch: Partial<Omit<DashboardWidget, 'id' | 'type'>>,
): DashboardWidget[] =>
    widgets.map((widget) =>
        widget.id === id ? { ...widget, ...patch } : widget,
    );

export const defaultConfig = (
    entry: DashboardCatalogEntry,
): DashboardWidgetConfig =>
    Object.fromEntries(
        entry.options.map((option) => [option.key, option.default]),
    );

/** A fresh, visible widget of a type, with that type's defaults. */
export function createWidget(entry: DashboardCatalogEntry): DashboardWidget {
    return {
        id: `${entry.type}-${Math.random().toString(36).slice(2, 10)}`,
        type: entry.type,
        variant: entry.variants[0],
        width: entry.defaultWidth,
        height: entry.defaultHeight,
        visible: true,
        config: defaultConfig(entry),
    };
}

/** The Inertia props the visible widgets read. */
export function requiredProps(
    widgets: DashboardWidget[],
    catalog: DashboardCatalogEntry[],
): string[] {
    const props = new Set<string>();

    for (const widget of widgets) {
        if (!widget.visible) continue;

        catalog
            .find((entry) => entry.type === widget.type)
            ?.props.forEach((prop) => props.add(prop));
    }

    return [...props];
}

export const sameLayout = (
    a: DashboardWidget[],
    b: DashboardWidget[],
): boolean => JSON.stringify(a) === JSON.stringify(b);

/** The value of one option of a widget, as text. */
export const optionOf = (
    widget: Pick<DashboardWidget, 'config'>,
    key: string,
    fallback: string,
): string => String(widget.config[key] ?? fallback);

/** Whether a show/hide option (`on`/`off`) is on; a missing one counts as on. */
export const isOn = (
    widget: Pick<DashboardWidget, 'config'>,
    key: string,
): boolean => optionOf(widget, key, 'on') !== 'off';
