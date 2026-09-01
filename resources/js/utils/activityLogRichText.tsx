import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { AssignableUser } from '@/types/Users';
import { ReactNode } from 'react';

// The assignee alternative is tried twice: quoted names first (the current
// backend format, unambiguous even if a name contains " to " or "; "), then
// a legacy unquoted fallback so activity logs written before names were
// quoted still render correctly.
const CHANGE_PATTERN =
    /(?:(status|priority) changed from "([a-z_]+)" to "([a-z_]+)")|(?:labels changed to \[([a-z_, ]*)\])|(?:assignee changed from "([^"]*)" to "([^"]*)")|(?:assignee changed from (.+?) to (.+?)(?=; |$))|(?:(?<=\b(?:[Ii]ssue|task:)\s)#(\d+))/g;

const StatusOrPriorityValue = ({
    value,
}: {
    value: 'open' | 'in_progress' | 'closed' | 'low' | 'medium' | 'high';
}) => (
    <span className="mx-0.5 inline-flex items-center gap-1 align-middle">
        <StatusDot status={value} size="sm" />
        <span className="font-medium capitalize text-[var(--text-color)]">
            {value.replace('_', ' ')}
        </span>
    </span>
);

const LabelsValue = ({ labelsCsv }: { labelsCsv: string }) => {
    const labels = labelsCsv
        .split(',')
        .map((label) => label.trim())
        .filter((label) => Boolean(label) && label !== 'none');

    if (labels.length === 0) {
        return <span className="italic">none</span>;
    }

    return (
        <span className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-middle">
            {labels.map((label) => (
                <Badge key={label} color={label as never}>
                    {label}
                </Badge>
            ))}
        </span>
    );
};

const AssigneeValue = ({
    name,
    avatar,
}: {
    name: string;
    avatar?: string | null;
}) => (
    <span className="mx-0.5 inline-flex items-center gap-1 align-middle">
        {name === 'Unassigned' ? (
            <Icon
                name="UserX"
                size={12}
                className="text-[var(--text-gray-color)]"
            />
        ) : (
            <Avatar
                src={avatar ?? undefined}
                alt={name}
                initials={name.charAt(0)}
                size="sm"
            />
        )}
        <span className="font-semibold text-[var(--text-color)]">{name}</span>
    </span>
);

/**
 * Renders an activity log body as plain text, except for the parts that
 * already have a real visual elsewhere in the app - status/priority/labels
 * changes get the same StatusDot/Badge FilterBar uses, an assignee change
 * gets a bold name with an avatar (or the "unassigned" icon) in front of
 * it, and an "#123" issue reference becomes a Badge - instead of raw text.
 *
 * The log body only ever carries the assignee's name as plain text, not
 * their avatar, so `users` (the same assignable-users list FilterDropdown
 * uses) is used to look one up by name when available.
 */
export function renderActivityLogBody(
    body: string,
    users: AssignableUser[] = [],
): ReactNode[] {
    const avatarByName = new Map(users.map((user) => [user.name, user.avatar]));
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let matchCount = 0;

    for (const match of body.matchAll(CHANGE_PATTERN)) {
        const [
            full,
            field,
            oldValue,
            newValue,
            labelsCsv,
            assigneeOldQuoted,
            assigneeNewQuoted,
            assigneeOldLegacy,
            assigneeNewLegacy,
            issueNumber,
        ] = match;
        const assigneeOld = assigneeOldQuoted ?? assigneeOldLegacy;
        const assigneeNew = assigneeNewQuoted ?? assigneeNewLegacy;
        const start = match.index ?? 0;

        if (start > lastIndex) {
            nodes.push(body.slice(lastIndex, start));
        }

        if (field) {
            nodes.push(`${field} changed from `);
            nodes.push(
                <StatusOrPriorityValue
                    key={`old-${matchCount}`}
                    value={oldValue as never}
                />,
            );
            nodes.push(' to ');
            nodes.push(
                <StatusOrPriorityValue
                    key={`new-${matchCount}`}
                    value={newValue as never}
                />,
            );
        } else if (labelsCsv !== undefined) {
            nodes.push('labels changed to ');
            nodes.push(
                <LabelsValue
                    key={`labels-${matchCount}`}
                    labelsCsv={labelsCsv}
                />,
            );
        } else if (assigneeOld !== undefined) {
            nodes.push('assignee changed from ');
            nodes.push(
                <AssigneeValue
                    key={`old-${matchCount}`}
                    name={assigneeOld}
                    avatar={avatarByName.get(assigneeOld)}
                />,
            );
            nodes.push(' to ');
            nodes.push(
                <AssigneeValue
                    key={`new-${matchCount}`}
                    name={assigneeNew}
                    avatar={avatarByName.get(assigneeNew)}
                />,
            );
        } else if (issueNumber !== undefined) {
            nodes.push(
                <Badge key={`issue-${matchCount}`}>#{issueNumber}</Badge>,
            );
        }

        lastIndex = start + full.length;
        matchCount += 1;
    }

    if (lastIndex < body.length) {
        nodes.push(body.slice(lastIndex));
    }

    return nodes;
}
