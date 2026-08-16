import Icon from '@/Components/Atoms/Icon/Icon';
import { useAlert } from '@/context/AlertContext';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { SavedFiltersDropdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import FilterButton from '../FilterButton/FilterButton';

const FILTERABLE_KEYS = ['labels', 'status', 'assignee', 'priority'] as const;

const FILTER_LABELS: Record<(typeof FILTERABLE_KEYS)[number], string> = {
    labels: 'Labels',
    status: 'Status',
    assignee: 'Assignee',
    priority: 'Priority',
};

const pickFilters = (
    queryParams: Record<string, any>,
): Record<string, string> => {
    const result: Record<string, string> = {};
    FILTERABLE_KEYS.forEach((key) => {
        if (queryParams?.[key]) result[key] = String(queryParams[key]);
    });
    return result;
};

const describeFilters = (filters: Record<string, any>) =>
    Object.entries(pickFilters(filters))
        .map(
            ([key, value]) =>
                `${FILTER_LABELS[key as (typeof FILTERABLE_KEYS)[number]]}: ${String(
                    value,
                )
                    .split(',')
                    .join(', ')}`,
        )
        .join(' · ');

const PANEL_WIDTH = 288;

const SavedFiltersDropdown: React.FC<SavedFiltersDropdownProps> = ({
    savedFilters: initialSavedFilters = [],
    queryParams = {},
    projectId,
    isOpen,
    onOpenChange,
}) => {
    const { addAlert } = useAlert();

    const { savedFilters, saveFilter, deleteFilter } = useSavedFilters(
        initialSavedFilters,
        projectId,
    );
    const [name, setName] = useState('');

    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null,
    );

    const activeFilters = useMemo(
        () => pickFilters(queryParams),
        [queryParams],
    );
    const activeFilterCount = Object.keys(activeFilters).length;
    const activeFiltersSignature = JSON.stringify(activeFilters);

    const updateCoords = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
            top: rect.bottom + 8,
            left: Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 12),
        });
    }, []);

    useEffect(() => {
        if (isOpen) updateCoords();
        else setName('');
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
            onOpenChange(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onOpenChange(false);
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
    }, [isOpen, onOpenChange, updateCoords]);

    const applyParams = (nextFilters: Record<string, any>) => {
        const nextParams: Record<string, any> = { ...queryParams, page: 1 };
        FILTERABLE_KEYS.forEach((key) => delete nextParams[key]);
        Object.assign(nextParams, nextFilters);

        router.get(window.location.pathname, nextParams, {
            preserveState: true,
            replace: true,
        });
        addAlert('Filters applied successfully', 'success');
    };

    const handleApply = (id: number) => {
        const saved = savedFilters.find((f) => f.id === id);
        if (!saved) return;
        applyParams(saved.query_params);
        onOpenChange(false);
    };

    const handleDelete = (event: React.MouseEvent, id: number) => {
        event.stopPropagation();
        deleteFilter(id);
    };

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed || activeFilterCount === 0) return;
        saveFilter(trimmed, activeFilters);
        setName('');
    };

    const handleClearAll = () => {
        applyParams({});
    };

    return (
        <>
            <div ref={triggerRef}>
                <FilterButton
                    icon="ListFilter"
                    label="Filters"
                    value={
                        activeFilterCount > 0
                            ? String(activeFilterCount)
                            : undefined
                    }
                    isActive={activeFilterCount > 0 || isOpen}
                    onClick={() => onOpenChange(!isOpen)}
                />
            </div>

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
                        className="animate-in fade-in zoom-in-95 flex max-h-[26rem] flex-col overflow-hidden rounded-xl border border-[var(--border-color-strong)] bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md duration-100"
                    >
                        <div className="flex items-center justify-between px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                Filters
                            </p>
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClearAll}
                                    className="cursor-pointer text-[10px] font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="border-[var(--border-color-strong)]/80 border-t px-3 py-2.5">
                            {activeFilterCount > 0 ? (
                                <div className="flex flex-col gap-2">
                                    <p className="truncate text-[11px] text-[var(--text-muted-color)]">
                                        {describeFilters(activeFilters)}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            value={name}
                                            onChange={(e) =>
                                                setName(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter')
                                                    handleSave();
                                            }}
                                            placeholder="Name this view…"
                                            className="w-full rounded-md border border-[var(--bg-light-color)] bg-[var(--bg-color)] px-2.5 py-1.5 text-xs text-[var(--text-color)] placeholder-[var(--text-muted-color)] outline-none transition-colors focus:border-[var(--accent-color)]"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSave}
                                            disabled={!name.trim()}
                                            className={cn(
                                                'border-[var(--accent-color)]/30 bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)]/20 flex shrink-0 cursor-pointer items-center gap-1 rounded-md border px-2 py-1.5 text-xs font-medium text-[var(--accent-color)] transition-colors',
                                                'disabled:cursor-not-allowed disabled:border-[var(--border-color-strong)] disabled:bg-transparent disabled:text-[var(--text-muted-color)]',
                                            )}
                                        >
                                            <Icon
                                                name="BookmarkPlus"
                                                size={13}
                                            />
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[11px] text-[var(--text-muted-color)]">
                                    Apply a filter above to save it as a view.
                                </p>
                            )}
                        </div>

                        <div className="border-[var(--border-color-strong)]/80 flex items-center justify-between border-t px-3 pb-1.5 pt-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                Saved Views
                            </p>
                            {savedFilters.length > 0 && (
                                <span className="text-[10px] text-[var(--text-muted-color)]">
                                    {savedFilters.length}
                                </span>
                            )}
                        </div>

                        {savedFilters.length === 0 ? (
                            <div className="flex flex-col items-center gap-1.5 px-3 pb-4 pt-2 text-center">
                                <Icon
                                    name="BookmarkX"
                                    size={20}
                                    color="var(--text-gray-color)"
                                />
                                <p className="text-xs font-medium text-[var(--text-muted-color)]">
                                    No saved views yet
                                </p>
                                <p className="text-[11px] text-[var(--text-muted-color)]">
                                    Save a filter combination above to reuse it
                                    later.
                                </p>
                            </div>
                        ) : (
                            <div className="scrollbar-hide space-y-0.5 overflow-y-auto px-1.5 pb-1.5">
                                {savedFilters.map((filter) => {
                                    const isActiveView =
                                        JSON.stringify(
                                            pickFilters(filter.query_params),
                                        ) === activeFiltersSignature;

                                    return (
                                        <div
                                            key={filter.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                handleApply(filter.id)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === 'Enter' ||
                                                    e.key === ' '
                                                ) {
                                                    e.preventDefault();
                                                    handleApply(filter.id);
                                                }
                                            }}
                                            className={cn(
                                                'group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all duration-150',
                                                isActiveView
                                                    ? 'bg-[var(--accent-color)]/10'
                                                    : 'hover:bg-[var(--bg-light-color)]',
                                            )}
                                        >
                                            <Icon
                                                name="Bookmark"
                                                size={13}
                                                color={
                                                    isActiveView
                                                        ? 'var(--accent-color)'
                                                        : '#71717a'
                                                }
                                                className="shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={cn(
                                                        'truncate text-xs font-medium',
                                                        isActiveView
                                                            ? 'text-[var(--accent-color)]'
                                                            : 'text-[var(--text-color)]',
                                                    )}
                                                >
                                                    {filter.name}
                                                </p>
                                                <p className="truncate text-[10px] text-[var(--text-muted-color)]">
                                                    {describeFilters(
                                                        filter.query_params,
                                                    )}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) =>
                                                    handleDelete(e, filter.id)
                                                }
                                                className="shrink-0 cursor-pointer rounded p-1 text-[var(--text-muted-color)] opacity-0 transition-all duration-150 hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)] group-hover:opacity-100"
                                            >
                                                <Icon name="Trash2" size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default SavedFiltersDropdown;
