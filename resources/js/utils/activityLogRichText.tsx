import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import { AssignableUser } from '@/types/Users';
import { ReactNode } from 'react';

const CHANGE_PATTERN =
    /(status|priority) changed from "([a-z_]+)" to "([a-z_]+)"|labels changed to \[([a-z_, ]*)]|assignee changed from "((?:[^"\\]|\\.)*)"(?:#(\d+))? to "((?:[^"\\]|\\.)*)"(?:#(\d+))?|assignee changed from (.+?) to (.+?)(?=; |$)|(?<=\b(?:[Ii]ssue|[Tt]ask|notification:?)\s|^|\s)#(\d+)(?=\b|\s|"|$)|(?<=\bby\s)([A-ZĄĆĘŁŃÓŚŹŻ][a-zA-Ząćęłńóśźż0-9_-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻa-zA-Ząćęłńóśźż0-9_-]+)*)(?=:|\s|$)|^([A-ZĄĆĘŁŃÓŚŹŻ][a-zA-Ząćęłńóśźż0-9_-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻa-zA-Ząćęłńóśźż0-9_-]+)*)(?=\s+(?:deleted|edited|commented|created|updated)\b)/g;

const unescapeQuoted = (value: string) => value.replace(/\\(.)/g, '$1');

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

export function renderActivityLogBody(
    body: string,
    users: AssignableUser[] = [],
    // The avatar of whoever performed the action this whole log entry
    // describes (from the entry's own user_id, not parsed out of the text).
    // Always the right person even when two project members share a name -
    // pass this whenever the caller already knows the entry's actor.
    actorAvatar?: string | null,
): ReactNode[] {
    const avatarById = new Map(users.map((user) => [user.id, user.avatar]));
    // Legacy fallback only: activity logs written before assignee names
    // carried an id suffix have no way to be resolved unambiguously, so a
    // name collision there still shows whichever matching user comes last.
    const avatarByName = new Map(users.map((user) => [user.name, user.avatar]));
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let matchCount = 0;

    const resolveAssigneeAvatar = (name: string, id?: string) => {
        if (id) {
            const avatar = avatarById.get(Number(id));
            if (avatar !== undefined) return avatar;
        }

        return avatarByName.get(name);
    };

    for (const match of body.matchAll(CHANGE_PATTERN)) {
        const [
            full,
            field,
            oldValue,
            newValue,
            labelsCsv,
            assigneeOldQuoted,
            assigneeOldId,
            assigneeNewQuoted,
            assigneeNewId,
            assigneeOldLegacy,
            assigneeNewLegacy,
            issueNumber,
            authorBy,
            authorStart,
        ] = match;

        const authorName = authorBy ?? authorStart;

        const assigneeOld =
            assigneeOldQuoted !== undefined
                ? unescapeQuoted(assigneeOldQuoted)
                : assigneeOldLegacy;
        const assigneeNew =
            assigneeNewQuoted !== undefined
                ? unescapeQuoted(assigneeNewQuoted)
                : assigneeNewLegacy;

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
                    avatar={resolveAssigneeAvatar(assigneeOld, assigneeOldId)}
                />,
            );
            nodes.push(' to ');
            nodes.push(
                <AssigneeValue
                    key={`new-${matchCount}`}
                    name={assigneeNew}
                    avatar={resolveAssigneeAvatar(assigneeNew, assigneeNewId)}
                />,
            );
        } else if (issueNumber !== undefined) {
            nodes.push(
                <Badge key={`issue-${matchCount}`}>#{issueNumber}</Badge>,
            );
        } else if (authorName !== undefined) {
            nodes.push(
                <AssigneeValue
                    key={`author-${matchCount}`}
                    name={authorName}
                    avatar={
                        actorAvatar !== undefined
                            ? actorAvatar
                            : avatarByName.get(authorName)
                    }
                />,
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
