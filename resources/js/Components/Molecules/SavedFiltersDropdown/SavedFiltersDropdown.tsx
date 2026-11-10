import { router } from '@inertiajs/react';
import React, { useEffect, useMemo, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useAlert } from '@/context/AlertContext';
import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { useProjectPriorities } from '@/context/ProjectPrioritiesContext';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { SavedFiltersDropdownProps } from '@/types/Components';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { cn } from '@/utils/cn';
import FilterButton from '../FilterButton/FilterButton';

const FILTERABLE_KEYS = [
    'labels',
    'status',
    'workflow_status',
    'assignee',
    'priority',
] as const;

const FILTER_LABELS: Record<(typeof FILTERABLE_KEYS)[number], string> = {
    labels: 'Labels',
    status: 'Status',
    workflow_status: 'Exact status',
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

const describeFilters = (
    filters: Record<string, any>,
    labels: ProjectLabel[],
    priorities: ProjectPriority[],
) =>
    Object.entries(pickFilters(filters))
        .map(([key, value]) => {
            const label =
                FILTER_LABELS[key as (typeof FILTERABLE_KEYS)[number]];
            const values = String(value).split(',');

            // Exact statuses and labels are stored as ids, which mean nothing
            // in a list: labels show their names while they still exist.
            if (key === 'labels') {
                const names = values.map(
                    (id) => labels.find((l) => String(l.id) === id)?.name,
                );

                return names.every(Boolean)
                    ? `${label}: ${names.join(', ')}`
                    : `${label}: ${values.length} selected`;
            }

            if (key === 'priority') {
                const names = values.map(
                    (id) =>
                        priorities.find(
                            (priority) => String(priority.id) === id,
                        )?.name,
                );

                return names.every(Boolean)
                    ? `${label}: ${names.join(', ')}`
                    : `${label}: ${values.length} selected`;
            }

            return key === 'workflow_status'
                ? `${label}: ${values.length} selected`
                : `${label}: ${values.join(', ')}`;
        })
        .join(' · ');

const SavedFiltersDropdown: React.FC<SavedFiltersDropdownProps> = ({
    savedFilters: initialSavedFilters = [],
    queryParams = {},
    projectId,
    isOpen,
    onOpenChange,
}) => {
    const { addAlert } = useAlert();
    const { labels } = useProjectLabels();
    const { priorities } = useProjectPriorities();

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
            panelClassName="max-h-104"
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
                <p className="text-[10px] font-bold tracking-wider text-(--text-muted-color) uppercase">
                    Filters
                </p>
                {activeFilterCount > 0 && (
                    <button
                        type="button"
                        onClick={handleClearAll}
                        className="cursor-pointer text-[10px] font-medium text-(--text-muted-color) transition-colors hover:text-(--text-color)"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="px-3 py-2.5">
                {activeFilterCount > 0 ? (
                    <div className="flex flex-col gap-2">
                        <p className="truncate text-[11px] text-(--text-muted-color)">
                            {describeFilters(activeFilters, labels, priorities)}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                }}
                                placeholder="Name this view…"
                                className="w-full rounded-lg bg-(--bg-light-color) px-2.5 py-1.5 text-xs text-(--text-color) outline-hidden transition-colors placeholder:text-(--text-muted-color)"
                            />
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={!name.trim()}
                                className={cn(
                                    'bg-(--accent-color)/10 hover:bg-(--accent-color)/20 flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-(--accent-color) transition-colors',
                                    'disabled:cursor-not-allowed disabled:bg-(--bg-light-color) disabled:text-(--text-muted-color)',
                                )}
                            >
                                <Icon name="BookmarkPlus" size={13} />
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-[11px] text-(--text-muted-color)">
                        Apply a filter above to save it as a view.
                    </p>
                )}
            </div>

            <span className="mx-3 block h-px shrink-0 bg-(--bg-light-color)" />

            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                <p className="text-[10px] font-bold tracking-wider text-(--text-muted-color) uppercase">
                    Saved Views
                </p>
                {savedFilters.length > 0 && (
                    <span className="text-[10px] text-(--text-muted-color)">
                        {savedFilters.length}
                    </span>
                )}
            </div>

            {savedFilters.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-4 text-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--bg-light-color)">
                        <Icon
                            name="BookmarkX"
                            size={16}
                            className="text-(--text-muted-color)"
                        />
                    </span>
                    <p className="text-xs font-medium text-(--text-muted-color)">
                        No saved views yet
                    </p>
                    <p className="text-[11px] text-(--text-muted-color)">
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
                                        ? 'bg-(--accent-color)/10'
                                        : 'hover:bg-(--bg-light-color)',
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
                                                ? 'text-(--accent-color)'
                                                : 'text-(--text-color)',
                                        )}
                                    >
                                        {filter.name}
                                    </p>
                                    <p className="truncate text-[10px] text-(--text-muted-color)">
                                        {describeFilters(
                                            filter.query_params,
                                            labels,
                                            priorities,
                                        )}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => handleDelete(e, filter.id)}
                                    className="shrink-0 cursor-pointer rounded-sm p-1 text-(--text-muted-color) opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-(--bg-light-color-hover) hover:text-(--text-color)"
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
