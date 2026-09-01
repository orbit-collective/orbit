import { ActivityLogEntry, ActivityLogGroup } from '@/types/ActivityLog';
import { icons } from 'lucide-react';

export type ActivityLogColor =
    'accent' | 'success' | 'warning' | 'error' | 'info';

interface ActivityLogVisual {
    icon: keyof typeof icons;
    color: ActivityLogColor;
}

const RULES: { pattern: RegExp; visual: ActivityLogVisual }[] = [
    {
        pattern: /^(added|created)/i,
        visual: { icon: 'Plus', color: 'success' },
    },
    {
        pattern: /^(deleted|removed|revoked)/i,
        visual: { icon: 'Trash2', color: 'error' },
    },
    {
        pattern: /^(invited|joined)/i,
        visual: { icon: 'UserPlus', color: 'accent' },
    },
    { pattern: /commented/i, visual: { icon: 'MessageSquare', color: 'info' } },
    {
        pattern: /role|permission/i,
        visual: { icon: 'ShieldCheck', color: 'warning' },
    },
    {
        pattern: /password|session|account/i,
        visual: { icon: 'Lock', color: 'warning' },
    },
    { pattern: /integration/i, visual: { icon: 'Plug', color: 'info' } },
    {
        pattern: /^(updated|changed)/i,
        visual: { icon: 'Pencil', color: 'info' },
    },
];

const DEFAULT_VISUAL: ActivityLogVisual = { icon: 'Activity', color: 'accent' };

export function getActivityLogVisual(body: string): ActivityLogVisual {
    const rule = RULES.find(({ pattern }) => pattern.test(body));

    return rule ? rule.visual : DEFAULT_VISUAL;
}

const minuteKey = (dateString: string): string => {
    const date = new Date(dateString);

    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
};

/**
 * Merges consecutive entries from the same person that happened within the
 * same minute (seconds excluded) into a single group, so a burst of quick
 * changes reads as one moment in time instead of a repeated header.
 */
export function groupActivityLogs(
    logs: ActivityLogEntry[],
): ActivityLogGroup[] {
    const groups: ActivityLogGroup[] = [];
    let previousGroupingKey: string | null = null;

    for (const log of logs) {
        const groupingKey = `${log.userId ?? 'unknown'}-${minuteKey(log.createdAt)}`;
        const previousGroup = groups[groups.length - 1];

        if (previousGroup && groupingKey === previousGroupingKey) {
            previousGroup.entries.push(log);
            continue;
        }

        groups.push({
            key: `${groupingKey}-${log.id}`,
            userId: log.userId,
            userName: log.userName,
            userAvatar: log.userAvatar,
            createdAt: log.createdAt,
            entries: [log],
        });
        previousGroupingKey = groupingKey;
    }

    return groups;
}
