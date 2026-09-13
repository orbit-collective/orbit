import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import { IssueType } from '@/types/IssueTypes';
import { RoleNameSummary, RoleTypeValue } from '@/types/Roles';
import { AssignableUser } from '@/types/Users';
import { cn } from '@/utils/cn';
import { ROLE_TYPE_THEME } from '@/utils/roleTheme';
import { ReactNode } from 'react';

const CHANGE_PATTERN =
    /(status|priority) changed from "([a-z_]+)" to "([a-z_]+)"|labels changed to \[([^\]]*)]|assignee changed from "((?:[^"\\]|\\.)*)"(?:#(\d+))? to "((?:[^"\\]|\\.)*)"(?:#(\d+))?|assignee changed from (.+?) to (.+?)(?=; |$)|(?<=\b(?:[Ii]ssue|task:|[Nn]otification:?|sub-issue of)\s)#(\d+)(?=\b|\s|"|$)|(?<=\bby\s)([A-ZĄĆĘŁŃÓŚŹŻ][a-zA-Ząćęłńóśźż0-9_-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻa-zA-Ząćęłńóśźż0-9_-]+)*)(?=:|\s|$)|^([A-ZĄĆĘŁŃÓŚŹŻ][a-zA-Ząćęłńóśźż0-9_-]+(?:\s+[A-ZĄĆĘŁŃÓŚŹŻa-zA-Ząćęłńóśźż0-9_-]+)*)(?=\s+(?:deleted|edited|commented|created|updated)\b)|(?<=\bthe )"([^"]+)"(?= label\b)|(?<=\bthe )"([^"]+)"(?= role\b)|transition from "([^"]+)" to "([^"]+)"|(?<=\bthe )"([^"]+)"(?= issue type\b)|(?<=\bthe )"([^"]+)"(?= workflow\b)|(?<=\bthe )"([^"]+)"(?= status\b)|(?<=\bMade )"([^"]+)"(?= the starting status\b)|(?<=sub-issues of )"([^"]+)"|(?<=\bthe )"([^"]+)"(?= template\b)/g;

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
                <LabelBadge key={label} label={label} />
            ))}
        </span>
    );
};

const RoleValue = ({ name, type }: { name: string; type?: RoleTypeValue }) => {
    const theme = ROLE_TYPE_THEME[type ?? 'custom'];

    return (
        <span
            className={cn(
                'mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-middle text-[10px] font-medium',
                theme.badgeClass,
            )}
        >
            <span className={cn('h-1.5 w-1.5 rounded-full', theme.dot)} />
            {name}
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
 * Falls back to a plain badge when the named type or status no longer
 * exists in the project - a log entry is a historical record, and the
 * thing it names may since have been renamed or deleted.
 */
const IssueTypeValue = ({
    name,
    issueType,
}: {
    name: string;
    issueType?: IssueType;
}) =>
    issueType ? (
        <IssueTypeBadge issueType={issueType} className="mx-0.5 align-middle" />
    ) : (
        <Badge>{name}</Badge>
    );

const WorkflowStatusValue = ({
    name,
    color,
}: {
    name: string;
    color?: string;
}) =>
    color ? (
        <WorkflowStatusBadge
            status={{ name, color }}
            className="mx-0.5 align-middle"
        />
    ) : (
        <Badge>{name}</Badge>
    );

export function renderActivityLogBody(
    body: string,
    users: AssignableUser[] = [],
    // The avatar of whoever performed the action this whole log entry
    // describes (from the entry's own user_id, not parsed out of the text).
    // Always the right person even when two project members share a name -
    // pass this whenever the caller already knows the entry's actor.
    actorAvatar?: string | null,
    // The project's current roles, used only to look up a role-management
    // message's tier (owner/admin/member/viewer/custom) by name so its badge
    // gets the same color as Settings > Roles & management. A role renamed
    // or deleted since the log was written just falls back to the "custom"
    // theme - there's no id in the log text to resolve it unambiguously.
    roles: RoleNameSummary[] = [],
    // The project's current issue types (with their workflow statuses), used
    // to give an issue-type or status named in the text its real icon/color,
    // the same way roles are resolved above.
    issueTypes: IssueType[] = [],
): ReactNode[] {
    const avatarById = new Map(users.map((user) => [user.id, user.avatar]));
    // Legacy fallback only: activity logs written before assignee names
    // carried an id suffix have no way to be resolved unambiguously, so a
    // name collision there still shows whichever matching user comes last.
    const avatarByName = new Map(users.map((user) => [user.name, user.avatar]));
    const roleTypeByName = new Map(roles.map((role) => [role.name, role.type]));
    const issueTypeByName = new Map(
        issueTypes.map((type) => [type.name, type]),
    );
    const statusColorByName = new Map(
        issueTypes.flatMap((type) =>
            (type.statuses ?? []).map((status) => [status.name, status.color]),
        ),
    );
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
            labelCrudName,
            roleCrudName,
            transitionFrom,
            transitionTo,
            issueTypeCrudName,
            workflowTypeName,
            statusCrudName,
            startingStatusName,
            subIssueParentTypeName,
            templateCrudName,
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
        } else if (labelCrudName !== undefined) {
            nodes.push(
                <LabelBadge
                    key={`label-crud-${matchCount}`}
                    label={labelCrudName}
                />,
            );
        } else if (roleCrudName !== undefined) {
            nodes.push(
                <RoleValue
                    key={`role-crud-${matchCount}`}
                    name={roleCrudName}
                    type={roleTypeByName.get(roleCrudName)}
                />,
            );
        } else if (transitionFrom !== undefined) {
            nodes.push('transition from ');
            nodes.push(
                <WorkflowStatusValue
                    key={`transition-from-${matchCount}`}
                    name={transitionFrom}
                    color={statusColorByName.get(transitionFrom)}
                />,
            );
            nodes.push(' to ');
            nodes.push(
                <WorkflowStatusValue
                    key={`transition-to-${matchCount}`}
                    name={transitionTo}
                    color={statusColorByName.get(transitionTo)}
                />,
            );
        } else if (
            issueTypeCrudName !== undefined ||
            workflowTypeName !== undefined ||
            subIssueParentTypeName !== undefined
        ) {
            const typeName = (issueTypeCrudName ??
                workflowTypeName ??
                subIssueParentTypeName) as string;
            nodes.push(
                <IssueTypeValue
                    key={`issue-type-${matchCount}`}
                    name={typeName}
                    issueType={issueTypeByName.get(typeName)}
                />,
            );
        } else if (
            statusCrudName !== undefined ||
            startingStatusName !== undefined
        ) {
            const statusName = (statusCrudName ?? startingStatusName) as string;
            nodes.push(
                <WorkflowStatusValue
                    key={`status-${matchCount}`}
                    name={statusName}
                    color={statusColorByName.get(statusName)}
                />,
            );
        } else if (templateCrudName !== undefined) {
            nodes.push(
                <Badge key={`template-${matchCount}`}>
                    {templateCrudName}
                </Badge>,
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
