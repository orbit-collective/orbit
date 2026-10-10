import { icons } from 'lucide-react';
import { CSSProperties, ReactNode } from 'react';

/**
 * - `select` — pick one option; closes on pick.
 * - `multiselect` — toggle several options; stays open.
 * - `menu` — a list of actions (no selection indicator); closes on pick.
 * - `panel` — free-form content inside the same floating surface.
 */
export type DropdownVariant = 'select' | 'multiselect' | 'menu' | 'panel';

export type DropdownPlacement = 'top' | 'bottom';
export type DropdownAlign = 'start' | 'end';

export type DropdownOptionRole =
    'option' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio';

export interface DropdownOptionItem {
    value: string;
    label: ReactNode;
    /** Text the search box matches against when `label` isn't a plain string. */
    searchLabel?: string;
    icon?: keyof typeof icons;
    iconColor?: string;
    description?: ReactNode;
    trailing?: ReactNode;
    disabled?: boolean;
    tone?: 'default' | 'danger';
    /** `separator` and `heading` render structure, not a selectable row. */
    kind?: 'option' | 'separator' | 'heading';
    /** Overrides the variant's default selection indicator for this row. */
    indicator?: 'check' | 'none';
    /** Overrides the variant's default ARIA role (e.g. radio vs checkbox rows in a menu). */
    role?: DropdownOptionRole;
    /** Overrides the variant's default close-on-select behavior for this row. */
    closeOnSelect?: boolean;
}

export interface DropdownTriggerState {
    isOpen: boolean;
}

export interface DropdownProps {
    variant?: DropdownVariant;
    /** The element that opens the dropdown; a function receives the open state. */
    trigger: ReactNode | ((state: DropdownTriggerState) => ReactNode);
    options?: DropdownOptionItem[];
    selectedValues?: string[];
    onSelect?: (value: string, option: DropdownOptionItem) => void;
    /** Small uppercase heading at the top of the panel. */
    title?: ReactNode;
    ariaLabel?: string;
    /** `auto` shows the search box once the list is long enough to need it. */
    searchable?: boolean | 'auto';
    searchPlaceholder?: string;
    emptyMessage?: string;
    /** Shows "N results" above the list (used by the filter dropdowns). */
    showCount?: boolean;
    /** Adds a "Clear" action while something is selected. */
    onClear?: () => void;
    clearLabel?: string;
    /** Adds a "Select all" footer (multiselect only); called to toggle all. */
    onSelectAll?: () => void;
    footer?: ReactNode;
    /** `panel` variant content; a function receives a `close` callback. */
    children?: ReactNode | ((api: { close: () => void }) => ReactNode);
    disabled?: boolean;
    placement?: DropdownPlacement;
    align?: DropdownAlign;
    /** Panel width in px, or `trigger` to match the trigger's width. */
    width?: number | 'trigger';
    closeOnSelect?: boolean;
    /** Controlled open state; omit for the dropdown to manage its own. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Opens the panel at a point (e.g. a context menu) instead of at the trigger. */
    anchorPoint?: { x: number; y: number } | null;
    triggerClassName?: string;
    panelClassName?: string;
}

export interface FloatingPosition {
    style: CSSProperties;
    side: DropdownPlacement;
}
