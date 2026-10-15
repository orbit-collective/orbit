import { router } from '@inertiajs/react';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { FilterDropdownProps, FilterDropdownType } from '@/types/Components';
import { ProjectLabel } from '@/types/Labels';
import { AssignableUser } from '@/types/Users';
import type { StatusGroup } from '@/utils/workflow';
import FilterButton from '../FilterButton/FilterButton';

interface FilterOption {
    value: string;
    label: string;
    render: () => ReactNode;
}

interface FilterConfig {
    paramKey: string;
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

const FILTER_CONFIG: Record<FilterDropdownType, FilterConfig> = {
    labels: {
        paramKey: 'labels',
        label: 'Labels',
        multiSelect: true,
        options: [],
    },
    status: {
        paramKey: 'status',
        label: 'Status',
        multiSelect: false,
        options: [
            { value: 'todo', label: 'To Do' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'done', label: 'Done' },
        ].map(({ value, label }) => ({
            value,
            label,
            render: () =>
                optionRow(label, <StatusDot status={value as any} size="sm" />),
        })),
    },
    workflowStatus: {
        paramKey: 'workflow_status',
        label: 'Exact status',
        multiSelect: true,
        options: [],
    },
    priority: {
        paramKey: 'priority',
        label: 'Priority',
        multiSelect: true,
        options: [
            { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' },
            { value: 'low', label: 'Low' },
        ].map(({ value, label }) => ({
            value,
            label,
            render: () =>
                optionRow(label, <StatusDot status={value as any} size="sm" />),
        })),
    },
    assignee: {
        paramKey: 'assignee',
        label: 'Assignee',
        multiSelect: true,
        options: [
            {
                value: 'unassigned',
                label: 'Unassigned',
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
};

const buildLabelsConfig = (labels: ProjectLabel[]): FilterConfig => ({
    ...FILTER_CONFIG.labels,
    options: labels.map((label) => ({
        value: label.name,
        label: label.name,
        render: () => <LabelBadge label={label.name} />,
    })),
});

/**
 * One option per status name; its value is the ids of every issue type's
 * status with that name, dot-joined, so a single choice selects them all.
 */
const buildWorkflowStatusConfig = (groups: StatusGroup[]): FilterConfig => ({
    ...FILTER_CONFIG.workflowStatus,
    options: groups.map((group) => ({
        value: group.ids.join('.'),
        label: group.name,
        render: () =>
            optionRow(
                group.name,
                <span
                    className="inline-block h-2 w-2 shrink-0 rounded-sm"
                    style={{ backgroundColor: group.color }}
                />,
            ),
    })),
});

const buildAssigneeConfig = (users: AssignableUser[]): FilterConfig => ({
    ...FILTER_CONFIG.assignee,
    options: [
        ...FILTER_CONFIG.assignee.options,
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
    const { labels: projectLabels } = useProjectLabels();

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

    const config = useMemo(() => {
        if (mode === 'assignee') return buildAssigneeConfig(users);
        if (mode === 'labels') return buildLabelsConfig(projectLabels);
        if (mode === 'workflowStatus')
            return buildWorkflowStatusConfig(statusGroups);
        return FILTER_CONFIG[mode];
    }, [mode, users, projectLabels, statusGroups]);

    const switchMode = () => {
        // The other mode's selection would keep filtering without being
        // visible, so it is cleared on the way over.
        const nextParams: Record<string, any> = { ...queryParams, page: 1 };
        delete nextParams[FILTER_CONFIG.status.paramKey];
        delete nextParams[FILTER_CONFIG.workflowStatus.paramKey];
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
            title={`Filter by ${config.label}`}
            searchPlaceholder={`Search ${config.label.toLowerCase()}…`}
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
                        className="flex w-full cursor-pointer items-center gap-2 border-0 border-t border-solid border-[var(--border-color)] bg-transparent px-3 py-2 text-left text-xs font-medium text-[var(--accent-color)] hover:bg-[var(--bg-light-color)]"
                    >
                        <Icon name="ArrowLeftRight" size={12} />
                        {exact ? 'Show categories' : 'Show exact statuses'}
                    </button>
                ) : undefined
            }
            open={isOpen}
            onOpenChange={onOpenChange}
            trigger={
                <FilterButton
                    label={FILTER_CONFIG[type].label}
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
