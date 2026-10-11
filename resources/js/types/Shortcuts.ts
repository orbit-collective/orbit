export type ShortcutAction = () => void;

export type ShortcutScope = 'global' | 'project' | 'issue';

export interface ShortcutDefinition {
    // e.g. 'c', 'g p', 'mod+k', '/'. An array gives one definition several
    // bindings (['?', '/']). `mod` is `meta` on macOS and `ctrl` elsewhere.
    key: string | string[];
    action: ShortcutAction;
    description: string;
    category?: 'Navigation' | 'Creation' | 'Search' | 'View' | 'Action';
    // The most specific scope wins when several definitions share a key.
    // Defaults to 'global'.
    scope?: ShortcutScope;
    disabled?: boolean;
}

export interface ShortcutContextType {
    register: (shortcut: ShortcutDefinition) => () => void;
    registerBatch: (shortcuts: ShortcutDefinition[]) => () => void;
    shortcuts: ShortcutDefinition[];
    triggerShortcut: (key: string) => void;
    /** Opens the read-only shortcut reference (the `?` help view). */
    openHelp: () => void;
}
