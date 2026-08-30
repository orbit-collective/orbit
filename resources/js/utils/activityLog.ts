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
