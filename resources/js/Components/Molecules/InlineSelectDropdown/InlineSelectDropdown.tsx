import Icon from '@/Components/Atoms/Icon/Icon';
import { InlineSelectDropdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
}: InlineSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
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
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen, updateCoords]);

    const selectValue = (nextValue: string) => {
        onChange(value === nextValue ? null : nextValue);
        setIsOpen(false);
    };

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                    'flex min-w-[9rem] cursor-pointer items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-all duration-100 ease-in-out disabled:cursor-not-allowed disabled:opacity-50',
                    selectedOption
                        ? 'border-[var(--accent-color)]/30 border-solid bg-[var(--bg-color)] text-[var(--accent-color)]'
                        : 'border-dashed border-[var(--bg-light-color)] bg-transparent text-[var(--text-gray-color)] hover:border-solid hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]',
                )}
            >
                <span
                    className={cn(
                        'truncate font-medium',
                        selectedOption
                            ? 'text-[var(--accent-color)]'
                            : 'text-[var(--text-gray-color)]',
                    )}
                >
                    {selectedOption?.label ?? placeholder}
                </span>
                <Icon
                    name="ChevronDown"
                    size={12}
                    color={
                        selectedOption
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
                                    onClick={() => {
                                        onChange(null);
                                        setIsOpen(false);
                                    }}
                                    className="cursor-pointer text-[10px] font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
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
                                    autoFocus
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder={`Search ${label.toLowerCase()}…`}
                                    className="w-full appearance-none rounded-md bg-transparent py-1 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--text-muted-color)]"
                                />
                            </div>
                        )}

                        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
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
                                            onClick={() =>
                                                selectValue(option.value)
                                            }
                                            className={cn(
                                                'group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-all duration-150',
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
