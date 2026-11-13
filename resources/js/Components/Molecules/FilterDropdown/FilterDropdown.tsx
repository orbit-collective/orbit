import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { useProjectPriorities } from '@/context/ProjectPrioritiesContext';
import { FilterDropdownProps, FilterDropdownType } from '@/types/Components';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { AssignableUser } from '@/types/Users';
import type { StatusGroup } from '@/utils/workflow';
import FilterButton from '../FilterButton/FilterButton';

interface FilterOption {
    value: string;
    label: string;
    render: () => ReactNode;
}

type Translate = (key: string) => string;

interface FilterConfig {
    paramKey: string;
    /** A translation key; the component translates it when it renders. */
    label: string;
    multiSelect: boolean;
    options: FilterOption[];
}

const optionRow = (label: string, dot: ReactNode) => (
    <span className="flex items-center gap-2">
        {dot}
        <span className="font-medium capitalize">{label}</span>
    </span>
);

const PARAM_KEYS = {
    status: 'status',
    workflowStatus: 'workflow_status',
};

const filterConfig = (
    t: Translate,
): Record<FilterDropdownType, FilterConfig> => ({
    labels: {
        paramKey: 'labels',
        label: 'filter_dropdown.labels',
        multiSelect: true,
        options: [],
    },
    status: {
        paramKey: PARAM_KEYS.status,
        label: 'filter_dropdown.status',
        multiSelect: false,
        options: [
            {
                value: 'todo',
                label: t('filter_dropdown.status_options.todo'),
            },
            {
                value: 'in_progress',
                label: t('filter_dropdown.status_options.in_progress'),
            },
            {
                value: 'done',
                label: t('filter_dropdown.status_options.done'),
            },
        ].map(({ value, label }) => ({
            value,
            label,
            render: () =>
                optionRow(label, <StatusDot status={value as any} size="sm" />),
        })),
    },
    workflowStatus: {
        paramKey: PARAM_KEYS.workflowStatus,
        label: 'filter_dropdown.workflow_status',
        multiSelect: true,
        options: [],
    },
    priority: {
        paramKey: 'priority',
        label: 'filter_dropdown.priority',
        multiSelect: true,
        options: [],
    },
    assignee: {
        paramKey: 'assignee',
        label: 'filter_dropdown.assignee',
        multiSelect: true,
        options: [
            {
                value: 'unassigned',
                label: t('filter_dropdown.unassigned'),
                icon: 'UserX' as const,
            },
        ].map(({ value, label, icon }) => ({
            value,
            label,
            render: () =>
                optionRow(
                    label,
                    <Icon
                        name={icon}
                        size={13}
                        color="var(--text-gray-color)"
                    />,
                ),
        })),
    },
});

/** One option per priority of the project's scale; the value is its id, which the server filters by. */
const buildPriorityConfig = (
    base: FilterConfig,
    priorities: ProjectPriority[],
): FilterConfig => ({
    ...base,
    options: priorities.map((priority) => ({
        value: String(priority.id),
        label: priority.name,
        render: () => (
            <span className="flex items-center gap-2">
                <PriorityIcon priority={priority} tooltip={false} />
                <span className="font-medium">{priority.name}</span>
            </span>
        ),
    })),
});

const buildLabelsConfig = (
    base: FilterConfig,
    labels: ProjectLabel[],
): FilterConfig => ({
    ...base,
    options: labels.map((label) => ({
        value: String(label.id),
        label: label.name,
        render: () => <LabelBadge label={label.name} />,
    })),
});

/**
 * One option per status name; its value is the ids of every issue type's
 * status with that name, dot-joined, so a single choice selects them all.
 */
const buildWorkflowStatusConfig = (
    base: FilterConfig,
    groups: StatusGroup[],
): FilterConfig => ({
    ...base,
    options: groups.map((group) => ({
        value: group.ids.join('.'),
        label: group.name,
        render: () =>
            optionRow(
                group.name,
                <span
                    className="inline-block h-2 w-2 shrink-0 rounded-xs"
                    style={{ backgroundColor: group.color }}
                />,
            ),
    })),
});

const buildAssigneeConfig = (
    base: FilterConfig,
    users: AssignableUser[],
): FilterConfig => ({
    ...base,
    options: [
        ...base.options,
        ...users.map((user) => ({
            value: String(user.id),
            label: user.name,
            render: () =>
                optionRow(
                    user.name,
                    <Avatar
                        src={user.avatar ?? undefined}
                        initials={user.name.charAt(0)}
                        size="sm"
                    />,
                ),
        })),
    ],
});

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    type,
    queryParams = {},
    users = [],
    statusGroups = [],
    isOpen,
    onOpenChange,
}) => {
    const { t } = useLaravelReactI18n();
    const { labels: projectLabels } = useProjectLabels();
    const { priorities } = useProjectPriorities();

    // The Status filter can list either the three categories or, when the
    // project has statuses of its own, the exact statuses. Both live in the
    // same dropdown; a button in its panel switches between them.
    const canShowExact = type === 'status' && statusGroups.length > 0;
    const [exact, setExact] = useState(() =>
        Boolean(queryParams?.workflow_status),
    );
    useEffect(() => {
        if (queryParams?.workflow_status) setExact(true);
        else if (queryParams?.status) setExact(false);
    }, [queryParams?.workflow_status, queryParams?.status]);

    const mode: FilterDropdownType =
        canShowExact && exact ? 'workflowStatus' : type;

    const filters = useMemo(() => filterConfig(t), [t]);

    const config = useMemo(() => {
        const base = filters[mode];

        if (mode === 'assignee') return buildAssigneeConfig(base, users);
        if (mode === 'labels') return buildLabelsConfig(base, projectLabels);
        if (mode === 'priority') return buildPriorityConfig(base, priorities);
        if (mode === 'workflowStatus')
            return buildWorkflowStatusConfig(base, statusGroups);
        return base;
    }, [filters, mode, users, projectLabels, priorities, statusGroups]);

    const switchMode = () => {
        // The other mode's selection would keep filtering without being
        // visible, so it is cleared on the way over.
        const nextParams: Record<string, any> = { ...queryParams, page: 1 };
        delete nextParams[PARAM_KEYS.status];
        delete nextParams[PARAM_KEYS.workflowStatus];
        router.get(window.location.pathname, nextParams, {
            preserveState: true,
            replace: true,
        });
        setExact(!exact);
    };

    const selected = useMemo(() => {
        const raw = queryParams?.[config.paramKey];
        const values = raw ? String(raw).split(',').filter(Boolean) : [];

        if (mode !== 'workflowStatus') return values;

        // The URL holds plain status ids; an option is selected once all of
        // its ids are there.
        return config.options
            .map((option) => option.value)
            .filter((value) =>
                value.split('.').every((id) => values.includes(id)),
            );
    }, [queryParams, config.paramKey, config.options, mode]);

    const options = useMemo(
        () =>
            config.options.map((option) => ({
                value: option.value,
                label: option.render(),
                searchLabel: option.label,
            })),
        [config.options],
    );

    const allSelected =
        config.options.length > 0 &&
        config.options.every((option) => selected.includes(option.value));

    const applyFilter = (values: string[]) => {
        const nextParams: Record<string, any> = { ...queryParams, page: 1 };
        if (values.length > 0) {
            nextParams[config.paramKey] = (
                mode === 'workflowStatus'
                    ? values.flatMap((value) => value.split('.'))
                    : values
            ).join(',');
        } else {
            delete nextParams[config.paramKey];
        }
        router.get(window.location.pathname, nextParams, {
            preserveState: true,
            replace: true,
        });
    };

    const toggleValue = (value: string) => {
        if (config.multiSelect) {
            applyFilter(
                selected.includes(value)
                    ? selected.filter((v) => v !== value)
                    : [...selected, value],
            );
        } else {
            applyFilter(selected.includes(value) ? [] : [value]);
        }
    };

    return (
        <Dropdown
            variant={config.multiSelect ? 'multiselect' : 'select'}
            title={t('filter_dropdown.title', { label: t(config.label) })}
            searchPlaceholder={t('filter_dropdown.search', {
                label: t(config.label).toLowerCase(),
            })}
            showCount
            width={256}
            options={options}
            selectedValues={selected}
            onSelect={toggleValue}
            onClear={() => applyFilter([])}
            onSelectAll={() =>
                applyFilter(
                    allSelected
                        ? []
                        : config.options.map((option) => option.value),
                )
            }
            footer={
                canShowExact ? (
                    <button
                        type="button"
                        data-nav
                        onClick={switchMode}
                        className="flex w-full cursor-pointer items-center gap-2 border-0 border-t border-(--border-color) bg-transparent px-3 py-2 text-left text-xs font-medium text-(--accent-color) transition-colors hover:bg-(--bg-light-color) focus:outline-hidden focus-visible:bg-(--bg-light-color) focus-visible:ring-2 focus-visible:ring-(--accent-color) focus-visible:ring-inset"
                    >
                        <Icon name="ArrowLeftRight" size={12} />
                        {exact
                            ? t('filter_dropdown.show_categories')
                            : t('filter_dropdown.show_exact')}
                    </button>
                ) : undefined
            }
            open={isOpen}
            onOpenChange={onOpenChange}
            trigger={
                <FilterButton
                    label={t(filters[type].label)}
                    value={
                        selected.length > 0
                            ? String(selected.length)
                            : undefined
                    }
                    isActive={selected.length > 0 || isOpen}
                    hasMenu
                />
            }
        />
    );
};

export default FilterDropdown;
