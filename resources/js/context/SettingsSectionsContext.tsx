import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

interface SettingsSectionsValue {
    /** Is the panel folded? An id nobody chose for yet uses its default. */
    isCollapsed: (id: string, defaultCollapsed: boolean) => boolean;
    toggle: (id: string, defaultCollapsed: boolean) => void;
    /** A mounted panel announces itself so "Collapse all" knows what to fold. */
    register: (id: string, defaultCollapsed: boolean) => () => void;
    /** How many collapsible panels the page currently shows. */
    count: number;
    allCollapsed: boolean;
    setAll: (collapsed: boolean) => void;
}

const SettingsSectionsContext = createContext<SettingsSectionsValue | null>(
    null,
);

const read = (storageKey: string): Record<string, boolean> => {
    try {
        const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '{}');

        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

interface ProviderProps {
    /** Where the choices are remembered, one entry per settings tab. */
    storageKey: string;
    children: ReactNode;
}

/**
 * Remembers which panels of one settings page are folded, per browser. Panels
 * opt in with an `id` (see SettingsPanel); the provider counts the ones that
 * are mounted so the page can offer a Collapse / Expand all button. A stored
 * choice wins over a panel's default; blocked storage only means nothing is
 * remembered.
 */
export function SettingsSectionsProvider({
    storageKey,
    children,
}: ProviderProps) {
    const [stored, setStored] = useState<Record<string, boolean>>(() =>
        read(storageKey),
    );
    const [panels, setPanels] = useState<Record<string, boolean>>({});

    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(stored));
        } catch {
            // Remembering is a convenience only.
        }
    }, [storageKey, stored]);

    const isCollapsed = useCallback(
        (id: string, defaultCollapsed: boolean) =>
            stored[id] ?? defaultCollapsed,
        [stored],
    );

    const toggle = useCallback(
        (id: string, defaultCollapsed: boolean) =>
            setStored((prev) => ({
                ...prev,
                [id]: !(prev[id] ?? defaultCollapsed),
            })),
        [],
    );

    const register = useCallback((id: string, defaultCollapsed: boolean) => {
        setPanels((prev) => ({ ...prev, [id]: defaultCollapsed }));

        return () =>
            setPanels((prev) => {
                const { [id]: _removed, ...rest } = prev;

                return rest;
            });
    }, []);

    const setAll = useCallback(
        (collapsed: boolean) =>
            setStored((prev) => ({
                ...prev,
                ...Object.fromEntries(
                    Object.keys(panels).map((id) => [id, collapsed]),
                ),
            })),
        [panels],
    );

    const ids = Object.keys(panels);

    const value = useMemo<SettingsSectionsValue>(
        () => ({
            isCollapsed,
            toggle,
            register,
            count: ids.length,
            allCollapsed:
                ids.length > 0 && ids.every((id) => stored[id] ?? panels[id]),
            setAll,
        }),
        // `ids` derives from `panels`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isCollapsed, toggle, register, panels, stored, setAll],
    );

    return (
        <SettingsSectionsContext.Provider value={value}>
            {children}
        </SettingsSectionsContext.Provider>
    );
}

export function useSettingsSections(): SettingsSectionsValue | null {
    return useContext(SettingsSectionsContext);
}

/**
 * The folded state of one panel, or null when the panel is not collapsible
 * here (no id, or not inside a settings page). Registers the panel while it is
 * mounted.
 */
export function useSettingsPanelState(
    id: string | undefined,
    defaultCollapsed = false,
) {
    const sections = useSettingsSections();
    const register = sections?.register;

    useEffect(() => {
        if (!id || !register) return;

        return register(id, defaultCollapsed);
    }, [id, register, defaultCollapsed]);

    if (!id || !sections) return null;

    return {
        collapsed: sections.isCollapsed(id, defaultCollapsed),
        toggle: () => sections.toggle(id, defaultCollapsed),
    };
}
