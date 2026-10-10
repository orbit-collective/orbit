import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { useProjectLabels } from '@/context/ProjectLabelsContext';
import { FilterDropdownProps, FilterDropdownType } from '@/types/Components';
import { ProjectLabel } from '@/types/Labels';
import { AssignableUser } from '@/types/Users';
import { router } from '@inertiajs/react';
import React, { ReactNode, useMemo } from 'react';
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
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'closed', label: 'Closed' },
        ].map(({ value, label }) => ({
            value,
            label,
            render: () =>
                optionRow(label, <StatusDot status={value as any} size="sm" />),
        })),
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
    isOpen,
    onOpenChange,
}) => {
    const { labels: projectLabels } = useProjectLabels();
    const config = useMemo(() => {
        if (type === 'assignee') return buildAssigneeConfig(users);
        if (type === 'labels') return buildLabelsConfig(projectLabels);
        return FILTER_CONFIG[type];
    }, [type, users, projectLabels]);

    const selected = useMemo(() => {
        const raw = queryParams?.[config.paramKey];
        return raw ? String(raw).split(',').filter(Boolean) : [];
    }, [queryParams, config.paramKey]);

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
            nextParams[config.paramKey] = values.join(',');
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
            open={isOpen}
            onOpenChange={onOpenChange}
            trigger={
                <FilterButton
                    label={config.label}
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
