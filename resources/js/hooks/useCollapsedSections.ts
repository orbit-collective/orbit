import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { CollapsibleProps } from '@/types/Components';

/** What a section hands to a card or panel to make it collapsible. */
export type CollapseProps = (
    id: string,
    summary?: ReactNode,
) => CollapsibleProps;

const read = (storageKey: string): Record<string, boolean> => {
    try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}');

        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

/**
 * Which sections of a page are folded, remembered per browser. `defaults`
 * lists every section id with its first-visit state; a stored choice wins over
 * it. Storage that is missing or blocked just means nothing is remembered.
 */
export function useCollapsedSections(
    storageKey: string,
    defaults: Record<string, boolean>,
) {
    const [state, setState] = useState<Record<string, boolean>>(() => ({
        ...defaults,
        ...read(storageKey),
    }));

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
            // Remembering is a convenience only.
        }
    }, [storageKey, state]);

    const ids = Object.keys(defaults);

    const toggle = useCallback(
        (id: string) => setState((prev) => ({ ...prev, [id]: !prev[id] })),
        [],
    );

    const setAll = useCallback(
        (collapsed: boolean) =>
            setState(
                Object.fromEntries(
                    Object.keys(defaults).map((id) => [id, collapsed]),
                ),
            ),
        // `defaults` is a literal that only supplies the ids.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [Object.keys(defaults).join('|')],
    );

    const collapse = useMemo<CollapseProps>(
        () => (id, summary) => ({
            collapsed: state[id] ?? false,
            onToggleCollapse: () => toggle(id),
            collapsedSummary: summary,
        }),
        [state, toggle],
    );

    return {
        collapse,
        setAll,
        allCollapsed: ids.every((id) => state[id]),
        anyCollapsed: ids.some((id) => state[id]),
    };
}
