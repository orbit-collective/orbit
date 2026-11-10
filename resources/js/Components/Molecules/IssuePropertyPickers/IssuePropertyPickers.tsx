import { ReactNode, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import Calendar from '@/Components/Molecules/Calendar/Calendar';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { DropdownOptionItem } from '@/types/Dropdown';
import { IssueType } from '@/types/IssueTypes';
import { PriorityDetails, ProjectPriority } from '@/types/Priorities';
import { AssignableUser } from '@/types/Users';
import { WorkflowStatus } from '@/types/Workflow';
import { cn } from '@/utils/cn';
import { formatWeekdayDate, parseDateKey } from '@/utils/time';

/**
 * Controlled pickers for one issue property each, shared by the quick-add row
 * (a draft) and the list rows (a saved issue). They only report the choice;
 * what happens with it is the caller's business.
 *
 * `revealOnRowHover` hides the chevron until the surrounding `group/row` is
 * hovered or holds focus, so a saved row reads as plain text until the pointer
 * is on it. A `disabled` picker is just its value.
 */
interface PickerProps {
    disabled?: boolean;
    revealOnRowHover?: boolean;
}

export const REVEAL_ON_ROW_HOVER =
    'opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100';

const trigger = (
    label: string,
    content: ReactNode,
    revealOnRowHover?: boolean,
) => (
    <button
        type="button"
        aria-label={label}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border-none bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-(--accent-color) focus-visible:outline-hidden"
    >
        {content}
        <Icon
            name="ChevronDown"
            size={12}
            className={cn(
                'text-(--text-muted-color)',
                revealOnRowHover && REVEAL_ON_ROW_HOVER,
            )}
        />
    </button>
);

interface TypePickerProps extends PickerProps {
    /** The types the issue may be changed to. */
    types: IssueType[];
    value: IssueType | null;
    onChange: (type: IssueType) => void;
}

export const TypePicker = ({
    types,
    value,
    onChange,
    disabled = false,
    revealOnRowHover,
}: TypePickerProps) => {
    const options = useMemo(
        (): DropdownOptionItem[] =>
            types.map((type) => ({
                value: String(type.id),
                label: <IssueTypeBadge issueType={type} />,
                searchLabel: type.name,
            })),
        [types],
    );

    if (!value) {
        return <span className="text-(--text-muted-color)">&mdash;</span>;
    }

    const badge = <IssueTypeBadge issueType={value} />;

    if (disabled || options.length === 0) return badge;

    return (
        <Dropdown
            variant="select"
            title="Issue type"
            ariaLabel="Issue type"
            options={options}
            selectedValues={[String(value.id)]}
            onSelect={(id) => {
                const next = types.find((type) => type.id === Number(id));
                if (next && next.id !== value.id) onChange(next);
            }}
            trigger={trigger('Issue type', badge, revealOnRowHover)}
        />
    );
};

interface StatusPickerProps extends PickerProps {
    /** The statuses that may be picked. */
    statuses: WorkflowStatus[];
    value: WorkflowStatus | null;
    onChange: (status: WorkflowStatus) => void;
}

export const StatusPicker = ({
    statuses,
    value,
    onChange,
    disabled = false,
    revealOnRowHover,
}: StatusPickerProps) => {
    const options = useMemo(
        (): DropdownOptionItem[] =>
            statuses.map((status) => ({
                value: String(status.id),
                label: <WorkflowStatusBadge status={status} />,
                searchLabel: status.name,
            })),
        [statuses],
    );

    if (!value) {
        return <span className="text-(--text-muted-color)">&mdash;</span>;
    }

    const badge = <WorkflowStatusBadge status={value} />;

    if (disabled || options.length === 0) return badge;

    return (
        <Dropdown
            variant="select"
            title="Status"
            ariaLabel="Status"
            options={options}
            selectedValues={[String(value.id)]}
            onSelect={(id) => {
                const next = statuses.find(
                    (status) => status.id === Number(id),
                );
                if (next) onChange(next);
            }}
            trigger={trigger('Status', badge, revealOnRowHover)}
        />
    );
};

interface AssigneePickerProps extends PickerProps {
    users: AssignableUser[];
    /** The assignee as the issue carries it, which may not be a listed member any more. */
    value: { name: string; avatar?: string | null } | null;
    selectedId: number | null;
    onChange: (userId: number | null) => void;
}

export const AssigneePicker = ({
    users,
    value,
    selectedId,
    onChange,
    disabled = false,
    revealOnRowHover,
}: AssigneePickerProps) => {
    const options = useMemo(
        (): DropdownOptionItem[] => [
            {
                value: '',
                searchLabel: 'Unassigned',
                label: (
                    <span className="flex items-center gap-2 text-(--text-gray-color)">
                        <Icon name="UserX" size={14} />
                        Unassigned
                    </span>
                ),
            },
            ...users.map((user) => ({
                value: String(user.id),
                searchLabel: user.name,
                label: (
                    <UserBadge
                        avatarSrc={user.avatar ?? undefined}
                        name={user.name}
                        size="sm"
                        showTooltip={false}
                    />
                ),
            })),
        ],
        [users],
    );

    const display = value ? (
        <UserBadge
            avatarSrc={value.avatar ?? undefined}
            name={value.name}
            size="sm"
            showTooltip={false}
        />
    ) : (
        <span className="flex items-center gap-1.5 text-(--text-muted-color)">
            <Icon name="UserX" size={13} />
            Unassigned
        </span>
    );

    if (disabled) return display;

    return (
        <Dropdown
            variant="select"
            title="Assignee"
            ariaLabel="Assignee"
            searchable="auto"
            options={options}
            selectedValues={[selectedId !== null ? String(selectedId) : '']}
            onSelect={(id) => onChange(id ? Number(id) : null)}
            trigger={trigger('Assignee', display, revealOnRowHover)}
        />
    );
};

interface PriorityPickerProps extends PickerProps {
    priorities: ProjectPriority[];
    value: PriorityDetails | null;
    /** The chosen priority's name, or null for "No priority". */
    onChange: (name: string | null) => void;
}

export const PriorityPicker = ({
    priorities,
    value,
    onChange,
    disabled = false,
    revealOnRowHover,
}: PriorityPickerProps) => {
    const options = useMemo(
        (): DropdownOptionItem[] => [
            ...priorities.map((priority) => ({
                value: priority.name,
                searchLabel: priority.name,
                label: (
                    <span className="flex items-center gap-2">
                        <PriorityIcon priority={priority} tooltip={false} />
                        {priority.name}
                    </span>
                ),
            })),
            {
                value: '',
                searchLabel: 'No priority',
                label: (
                    <span className="flex items-center gap-2">
                        <PriorityIcon priority={null} tooltip={false} />
                        No priority
                    </span>
                ),
            },
        ],
        [priorities],
    );

    const display = (
        <span className="flex items-center gap-1.5 text-(--text-color)">
            <PriorityIcon priority={value} tooltip={false} />
            {value?.name ?? 'None'}
        </span>
    );

    if (disabled) return display;

    return (
        <Dropdown
            variant="select"
            title="Priority"
            ariaLabel="Priority"
            options={options}
            selectedValues={[value?.name ?? '']}
            onSelect={(name) => onChange(name || null)}
            trigger={trigger('Priority', display, revealOnRowHover)}
        />
    );
};

const toLocalDateString = (date: Date) =>
    [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');

const parseDate = (value?: string | null) =>
    value ? parseDateKey(value.slice(0, 10)) : undefined;

interface DatePickerProps extends PickerProps {
    label: string;
    /** "YYYY-MM-DD", or empty for no date. */
    value: string | null | undefined;
    /** For an end date: nothing earlier than the start can be picked. */
    minDate?: string | null;
    onChange: (date: string) => void;
}

/**
 * A date as plain text that opens the app's own Calendar in the same overlay
 * the issue page uses, portalled out of the table it sits in.
 */
export const DatePicker = ({
    label,
    value,
    minDate,
    onChange,
    disabled = false,
    revealOnRowHover,
}: DatePickerProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const text = (
        <>
            <Icon name={value ? 'CalendarDays' : 'CalendarX2'} size={12} />
            {value ? formatWeekdayDate(value) : 'No date'}
        </>
    );

    if (disabled) {
        return (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                {text}
            </span>
        );
    }

    const close = () => setIsOpen(false);

    return (
        <>
            <button
                type="button"
                aria-label={label}
                onClick={() => setIsOpen(true)}
                className={cn(
                    'inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border-none bg-transparent p-0 text-[11px]',
                    'text-(--text-muted-color) hover:text-(--text-color) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-color)',
                )}
            >
                {text}
                <Icon
                    name="ChevronDown"
                    size={12}
                    className={cn(revealOnRowHover && REVEAL_ON_ROW_HOVER)}
                />
            </button>
            {isOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 z-100 flex items-center justify-center bg-(--overlay-color) backdrop-blur-[2px]"
                        onClick={close}
                    >
                        <div onClick={(e) => e.stopPropagation()}>
                            <Calendar
                                selectedDate={parseDate(value)}
                                minDate={parseDate(minDate)}
                                rangeStart={parseDate(minDate)}
                                onSelect={(date) => {
                                    onChange(toLocalDateString(date));
                                    close();
                                }}
                                onClose={close}
                            />
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};
