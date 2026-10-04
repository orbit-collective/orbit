import Icon from '@/Components/Atoms/Icon/Icon';
import { InlineSelectDropdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { icons } from 'lucide-react';
import {
    KeyboardEvent as ReactKeyboardEvent,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

const PANEL_WIDTH = 224;
const SEARCH_THRESHOLD = 6;

/**
 * A single-select floating dropdown, visually matching FilterDropdown
 * (the filter-bar dropdowns) — same portal panel, search box, and
 * checkmark rows — but controlled via plain value/onChange props instead
 * of URL query params, for use anywhere a native <select> would otherwise
 * be reached for (e.g. the integration field-mapping table).
 */
export default function InlineSelectDropdown({
    label,
    placeholder,
    options,
    value,
    onChange,
    disabled = false,
    subtle = false,
}: InlineSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const listboxId = useId();
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null,
    );

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value],
    );

    const showSearch = options.length > SEARCH_THRESHOLD;

    const filteredOptions = useMemo(() => {
        if (!showSearch || !search.trim()) return options;
        const query = search.trim().toLowerCase();
        return options.filter((option) =>
            option.label.toLowerCase().includes(query),
        );
    }, [options, search, showSearch]);

    const updateCoords = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + 6,
            left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 12),
        });
    }, []);

    useEffect(() => {
        if (isOpen) updateCoords();
        else setSearch('');
    }, [isOpen, updateCoords]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                panelRef.current?.contains(target) ||
                triggerRef.current?.contains(target)
            ) {
                return;
            }
            setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen, updateCoords]);

    const closeAndRestoreFocus = useCallback(() => {
        setIsOpen(false);
        triggerRef.current?.focus();
    }, []);

    // Move focus to the selected option (or the first focusable item) once the
    // panel is mounted. With the search box the input keeps autoFocus.
    useEffect(() => {
        if (!isOpen || !coords || showSearch) return;
        const items = getNavItems();
        const selected = items.find(
            (item) => item.getAttribute('aria-selected') === 'true',
        );
        (selected ?? items[0])?.focus();
    }, [isOpen, coords !== null, showSearch]);

    function getNavItems(): HTMLElement[] {
        return Array.from(
            panelRef.current?.querySelectorAll<HTMLElement>('[data-nav]') ?? [],
        );
    }

    const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            // Close only this dropdown, not a parent modal.
            event.preventDefault();
            event.stopPropagation();
            closeAndRestoreFocus();
            return;
        }
        if (event.key === 'Tab') {
            // The panel is portaled to <body>, so hand focus back to the
            // trigger and let the browser's default Tab/Shift+Tab move on
            // from there to the next/previous control.
            closeAndRestoreFocus();
            return;
        }

        const items = getNavItems();
        if (items.length === 0) return;
        const current = items.indexOf(document.activeElement as HTMLElement);
        let next: number | null = null;

        if (event.key === 'ArrowDown') next = (current + 1) % items.length;
        else if (event.key === 'ArrowUp')
            next = current <= 0 ? items.length - 1 : current - 1;
        else if (event.key === 'Home' && event.target !== searchRef.current)
            next = 0;
        else if (event.key === 'End' && event.target !== searchRef.current)
            next = items.length - 1;

        if (next !== null) {
            event.preventDefault();
            items[next].focus();
        }
    };

    const handleTriggerKeyDown = (
        event: ReactKeyboardEvent<HTMLButtonElement>,
    ) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
        }
    };

    const selectValue = (nextValue: string) => {
        onChange(value === nextValue ? null : nextValue);
        closeAndRestoreFocus();
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listboxId : undefined}
                onClick={() => setIsOpen((prev) => !prev)}
                onKeyDown={handleTriggerKeyDown}
                className={cn(
                    'flex min-w-[9rem] cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-all duration-100 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:cursor-not-allowed disabled:opacity-50',
                    selectedOption && subtle
                        ? 'border-solid border-[var(--border-color)] bg-[var(--bg-color)] text-[var(--text-color)]'
                        : selectedOption
                          ? 'border-solid border-[var(--accent-color-opacity)] bg-[var(--bg-color)] text-[var(--accent-color)]'
                          : 'border-dashed border-[var(--bg-light-color)] bg-transparent text-[var(--text-gray-color)] hover:border-solid hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                )}
            >
                <span className="flex min-w-0 items-center gap-1.5">
                    {selectedOption?.icon && (
                        <Icon
                            name={selectedOption.icon as keyof typeof icons}
                            size={13}
                            color={selectedOption.color}
                            className="shrink-0"
                        />
                    )}
                    <span
                        className={cn(
                            'truncate font-medium',
                            selectedOption && subtle
                                ? 'text-[var(--text-color)]'
                                : selectedOption
                                  ? 'text-[var(--accent-color)]'
                                  : 'text-[var(--text-gray-color)]',
                        )}
                    >
                        {selectedOption?.label ?? placeholder}
                    </span>
                </span>
                <Icon
                    name="ChevronDown"
                    size={12}
                    color={
                        selectedOption && !subtle
                            ? 'var(--accent-color)'
                            : 'var(--text-gray-color)'
                    }
                />
            </button>

            {isOpen &&
                coords &&
                createPortal(
                    <div
                        ref={panelRef}
                        onKeyDown={handlePanelKeyDown}
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            zIndex: 9999,
                            width: PANEL_WIDTH,
                        }}
                        className="animate-in fade-in zoom-in-95 flex max-h-[22rem] flex-col overflow-hidden rounded-2xl bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md duration-100"
                    >
                        <div className="flex shrink-0 items-center justify-between px-3 pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                {label}
                            </p>
                            {selectedOption && (
                                <button
                                    type="button"
                                    data-nav
                                    onClick={() => {
                                        onChange(null);
                                        closeAndRestoreFocus();
                                    }}
                                    className="cursor-pointer rounded-sm text-[10px] font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)] focus:text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {showSearch && (
                            <div className="mt-2 flex shrink-0 items-center gap-2 px-3">
                                <Icon
                                    name="Search"
                                    size={14}
                                    className="shrink-0 text-[var(--text-muted-color)]"
                                />
                                <input
                                    ref={searchRef}
                                    data-nav
                                    autoFocus
                                    aria-label={`Search ${label.toLowerCase()}`}
                                    aria-controls={listboxId}
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder={`Search ${label.toLowerCase()}…`}
                                    className="w-full appearance-none rounded-md bg-transparent py-1 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--text-muted-color)]"
                                />
                            </div>
                        )}

                        <div
                            id={listboxId}
                            role="listbox"
                            aria-label={label}
                            className="mt-2 min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5"
                        >
                            {filteredOptions.length === 0 ? (
                                <div className="flex flex-col items-center gap-1.5 px-3 py-6 text-center">
                                    <Icon
                                        name="SearchX"
                                        size={18}
                                        className="text-[var(--text-muted-color)]"
                                    />
                                    <p className="text-xs font-medium text-[var(--text-muted-color)]">
                                        No matches found
                                    </p>
                                </div>
                            ) : (
                                filteredOptions.map((option) => {
                                    const isSelected = option.value === value;
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            data-nav
                                            onClick={() =>
                                                selectValue(option.value)
                                            }
                                            className={cn(
                                                'group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-150 focus:bg-[var(--bg-light-color)] focus:text-[var(--text-color)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--accent-color)]',
                                                isSelected
                                                    ? 'bg-[var(--accent-color)]/10 text-[var(--text-color)]'
                                                    : 'text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
                                                    isSelected
                                                        ? 'bg-[var(--accent-color)]'
                                                        : 'bg-[var(--bg-light-color)]',
                                                )}
                                            >
                                                {isSelected && (
                                                    <Icon
                                                        name="Check"
                                                        size={10}
                                                        className="text-white"
                                                    />
                                                )}
                                            </div>
                                            {option.icon && (
                                                <Icon
                                                    name={
                                                        option.icon as keyof typeof icons
                                                    }
                                                    size={13}
                                                    color={option.color}
                                                    className="shrink-0"
                                                />
                                            )}
                                            <span className="font-medium">
                                                {option.label}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
}
