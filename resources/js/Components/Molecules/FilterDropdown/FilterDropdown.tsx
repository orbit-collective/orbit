import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { FilterDropdownProps, FilterDropdownType } from '@/types/Components';
import { AssignableUser } from '@/types/Users';
import { cn } from '@/utils/cn';
import { router } from '@inertiajs/react';
import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
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
        options: ['bug', 'feature', 'performance', 'design', 'ux', 'chore'].map(
            (value) => ({
                value,
                label: value,
                render: () => <Badge color={value as any}>{value}</Badge>,
            }),
        ),
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

const PANEL_WIDTH = 256;
const SEARCH_THRESHOLD = 6;

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    type,
    queryParams = {},
    users = [],
    isOpen,
    onOpenChange,
}) => {
    const config = useMemo(
        () =>
            type === 'assignee'
                ? buildAssigneeConfig(users)
                : FILTER_CONFIG[type],
        [type, users],
    );
    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(
        null,
    );
    const [search, setSearch] = useState('');

    const selected = useMemo(() => {
        const raw = queryParams?.[config.paramKey];
        return raw ? String(raw).split(',').filter(Boolean) : [];
    }, [queryParams, config.paramKey]);

    const showSearch = config.options.length > SEARCH_THRESHOLD;

    const filteredOptions = useMemo(() => {
        if (!showSearch || !search.trim()) return config.options;
        const query = search.trim().toLowerCase();
        return config.options.filter((option) =>
            option.label.toLowerCase().includes(query),
        );
    }, [config.options, search, showSearch]);

    const allSelected =
        config.options.length > 0 &&
        config.options.every((option) => selected.includes(option.value));

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
            const next = selected.includes(value)
                ? selected.filter((v) => v !== value)
                : [...selected, value];
            applyFilter(next);
        } else {
            applyFilter(selected.includes(value) ? [] : [value]);
        }
    };

    const toggleSelectAll = () => {
        applyFilter(
            allSelected ? [] : config.options.map((option) => option.value),
        );
    };

    return (
        <>
            <div ref={triggerRef}>
                <FilterButton
                    label={config.label}
                    value={
                        selected.length > 0
                            ? String(selected.length)
                            : undefined
                    }
                    isActive={selected.length > 0 || isOpen}
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
                        className="animate-in fade-in zoom-in-95 flex max-h-[26rem] flex-col overflow-hidden rounded-2xl bg-[var(--bg-dark-color)] shadow-2xl backdrop-blur-md duration-100"
                    >
                        <div className="flex shrink-0 items-center justify-between px-3 pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                Filter by {config.label}
                            </p>
                            {selected.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => applyFilter([])}
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
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={`Search ${config.label.toLowerCase()}…`}
                                    className="w-full appearance-none rounded-md bg-transparent py-1 text-sm text-[var(--text-color)] outline-none placeholder:text-[var(--text-muted-color)]"
                                />
                            </div>
                        )}

                        <p className="shrink-0 px-3 pb-1.5 pt-2 text-[11px] text-[var(--text-muted-color)]">
                            {filteredOptions.length}{' '}
                            {filteredOptions.length === 1
                                ? 'result'
                                : 'results'}
                        </p>

                        <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-1.5">
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
                                    const isSelected = selected.includes(
                                        option.value,
                                    );
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() =>
                                                toggleValue(option.value)
                                            }
                                            className={cn(
                                                'group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-all duration-150',
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
                                            {option.render()}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {config.multiSelect && config.options.length > 0 && (
                            <button
                                type="button"
                                onClick={toggleSelectAll}
                                className="flex shrink-0 items-center gap-2 px-3 py-2.5 text-xs text-[var(--text-gray-color)] transition-colors hover:text-[var(--text-color)]"
                            >
                                <div
                                    className={cn(
                                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] transition-all duration-150',
                                        allSelected
                                            ? 'bg-[var(--accent-color)]'
                                            : 'bg-[var(--bg-light-color)]',
                                    )}
                                >
                                    {allSelected && (
                                        <Icon
                                            name="Check"
                                            size={10}
                                            className="text-white"
                                        />
                                    )}
                                </div>
                                <span className="font-medium">Select all</span>
                                <span className="ml-auto text-[var(--text-muted-color)]">
                                    {config.options.length}
                                </span>
                            </button>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
};

export default FilterDropdown;
