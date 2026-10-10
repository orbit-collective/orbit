import { router } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useAlert } from '@/context/AlertContext';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { SavedFiltersDropdownProps } from '@/types/Components';
import { cn } from '@/utils/cn';
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

    const activeFilters = useMemo(
        () => pickFilters(queryParams),
        [queryParams],
    );
    const activeFilterCount = Object.keys(activeFilters).length;
    const activeFiltersSignature = JSON.stringify(activeFilters);

    useEffect(() => {
        if (!isOpen) setName('');
    }, [isOpen]);

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
        <Dropdown
            variant="panel"
            ariaLabel="Saved filters"
            width={288}
            open={isOpen}
            onOpenChange={onOpenChange}
            panelClassName="max-h-[26rem]"
            trigger={
                <FilterButton
                    icon="ListFilter"
                    label="Filters"
                    value={
                        activeFilterCount > 0
                            ? String(activeFilterCount)
                            : undefined
                    }
                    isActive={activeFilterCount > 0 || isOpen}
                    hasMenu
                />
            }
        >
            <div className="flex items-center justify-between px-3 pt-3">
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

            <div className="px-3 py-2.5">
                {activeFilterCount > 0 ? (
                    <div className="flex flex-col gap-2">
                        <p className="truncate text-[11px] text-[var(--text-muted-color)]">
                            {describeFilters(activeFilters)}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                }}
                                placeholder="Name this view…"
                                className="w-full rounded-lg bg-[var(--bg-light-color)] px-2.5 py-1.5 text-xs text-[var(--text-color)] outline-none transition-colors placeholder:text-[var(--text-muted-color)]"
                            />
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!name.trim()}
                                className={cn(
                                    'bg-[var(--accent-color)]/10 hover:bg-[var(--accent-color)]/20 flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--accent-color)] transition-colors',
                                    'disabled:cursor-not-allowed disabled:bg-[var(--bg-light-color)] disabled:text-[var(--text-muted-color)]',
                                )}
                            >
                                <Icon name="BookmarkPlus" size={13} />
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

            <span className="mx-3 block h-px shrink-0 bg-[var(--bg-light-color)]" />

            <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
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
                <div className="flex flex-col items-center gap-2 px-3 pb-4 pt-2 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-light-color)]">
                        <Icon
                            name="BookmarkX"
                            size={16}
                            className="text-[var(--text-muted-color)]"
                        />
                    </span>
                    <p className="text-xs font-medium text-[var(--text-muted-color)]">
                        No saved views yet
                    </p>
                    <p className="text-[11px] text-[var(--text-muted-color)]">
                        Save a filter combination above to reuse it later.
                    </p>
                </div>
            ) : (
                <div className="scrollbar-hide space-y-0.5 overflow-y-auto px-1.5 pb-1.5">
                    {savedFilters.map((filter) => {
                        const isActiveView =
                            JSON.stringify(pickFilters(filter.query_params)) ===
                            activeFiltersSignature;

                        return (
                            <div
                                key={filter.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleApply(filter.id)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
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
                                        {describeFilters(filter.query_params)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, filter.id)}
                                    className="shrink-0 cursor-pointer rounded p-1 text-[var(--text-muted-color)] opacity-0 transition-all duration-150 hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)] group-hover:opacity-100"
                                >
                                    <Icon name="Trash" size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </Dropdown>
    );
};

export default SavedFiltersDropdown;
