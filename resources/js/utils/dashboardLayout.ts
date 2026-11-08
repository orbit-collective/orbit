import {
    DashboardCatalogEntry,
    DashboardWidget,
    DashboardWidgetConfig,
} from '@/types/Dashboard';

/** Most widgets one dashboard may hold, as on the server. */
export const MAX_DASHBOARD_WIDGETS = 30;

/** Tailwind needs the classes spelled out, so a width maps to them here. */
const SPAN_CLASSES: Record<number, string> = {
    3: 'col-span-12 sm:col-span-6 lg:col-span-3',
    4: 'col-span-12 md:col-span-6 lg:col-span-4',
    6: 'col-span-12 lg:col-span-6',
    8: 'col-span-12 lg:col-span-8',
    12: 'col-span-12',
};

export const spanClass = (span: number): string =>
    SPAN_CLASSES[span] ?? SPAN_CLASSES[12];

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
        span: entry.defaultSpan,
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
