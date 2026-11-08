import { router } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    DashboardCatalogEntry,
    DashboardWidget,
    DashboardWidgetType,
} from '@/types/Dashboard';
import {
    MAX_DASHBOARD_WIDGETS,
    createWidget,
    moveWidget,
    requiredProps,
    sameLayout,
    shiftWidget,
    updateWidget,
} from '@/utils/dashboardLayout';

const LAYOUT_URL = '/dashboard/layout';

/**
 * The state of the dashboard editor: a draft of the layout that is only sent
 * to the server on save. `loadedProps` are the page props that already
 * arrived; a widget added to the draft whose data is missing gets it with a
 * partial reload.
 */
export function useDashboardEditor(
    saved: DashboardWidget[],
    catalog: DashboardCatalogEntry[],
    loadedProps: string[],
) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<DashboardWidget[]>(saved);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const missing = useMemo(
        () =>
            editing
                ? requiredProps(draft, catalog).filter(
                      (prop) => !loadedProps.includes(prop),
                  )
                : [],
        [editing, draft, catalog, loadedProps],
    );
    const missingKey = missing.join(',');

    useEffect(() => {
        if (missingKey === '') return;

        router.reload({
            only: missingKey.split(','),
        });
    }, [missingKey]);

    const start = useCallback(() => {
        setDraft(saved);
        setSelectedId(null);
        setEditing(true);
    }, [saved]);

    const cancel = useCallback(() => {
        setEditing(false);
        setSelectedId(null);
    }, []);

    const finish = useCallback(() => {
        setEditing(false);
        setSelectedId(null);
    }, []);

    const send = useCallback(
        (method: 'put' | 'delete') => {
            const options = {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
                onSuccess: finish,
            };

            if (method === 'put') {
                router.put(LAYOUT_URL, { widgets: draft }, options);
            } else {
                router.delete(LAYOUT_URL, options);
            }
        },
        [draft, finish],
    );

    const patch = useCallback(
        (id: string, change: Partial<Omit<DashboardWidget, 'id' | 'type'>>) =>
            setDraft((widgets) => updateWidget(widgets, id, change)),
        [],
    );

    return {
        editing,
        draft,
        selectedId,
        saving,
        dirty: !sameLayout(draft, saved),
        canAdd: draft.length < MAX_DASHBOARD_WIDGETS,
        start,
        cancel,
        save: () => send('put'),
        reset: () => send('delete'),
        select: setSelectedId,
        reorder: (fromId: string, toId: string) =>
            setDraft((widgets) => moveWidget(widgets, fromId, toId)),
        shift: (id: string, delta: -1 | 1) =>
            setDraft((widgets) => shiftWidget(widgets, id, delta)),
        setVariant: (id: string, variant: string) => patch(id, { variant }),
        setSpan: (id: string, span: number) => patch(id, { span }),
        setOption: (id: string, key: string, value: string | number) =>
            setDraft((widgets) =>
                widgets.map((widget) =>
                    widget.id === id
                        ? {
                              ...widget,
                              config: { ...widget.config, [key]: value },
                          }
                        : widget,
                ),
            ),
        toggleVisible: (id: string) =>
            setDraft((widgets) =>
                widgets.map((widget) =>
                    widget.id === id
                        ? { ...widget, visible: !widget.visible }
                        : widget,
                ),
            ),
        remove: (id: string) => {
            setDraft((widgets) => widgets.filter((widget) => widget.id !== id));
            setSelectedId((current) => (current === id ? null : current));
        },
        add: (type: DashboardWidgetType) => {
            const entry = catalog.find((item) => item.type === type);

            if (!entry || draft.length >= MAX_DASHBOARD_WIDGETS) return;

            const widget = createWidget(entry);

            setDraft((widgets) => [...widgets, widget]);
            setSelectedId(widget.id);
        },
    };
}
