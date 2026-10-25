import { icons } from 'lucide-react';

/**
 * Curated subset of lucide-react icon names offered by the priority icon
 * picker, ordered roughly from most to least urgent. Kept as plain strings
 * (like the issue type icons) so the picker stays a small, on-brand set.
 */
export const PRIORITY_ICON_OPTIONS: (keyof typeof icons)[] = [
    'SignalHigh',
    'SignalMedium',
    'SignalLow',
    'Signal',
    'SignalZero',
    'ChevronsUp',
    'ChevronUp',
    'Equal',
    'Minus',
    'ChevronDown',
    'ChevronsDown',
    'ArrowUp',
    'ArrowDown',
    'Flame',
    'Zap',
    'Siren',
    'TriangleAlert',
    'OctagonAlert',
    'CircleAlert',
    'ShieldAlert',
    'Flag',
    'Star',
    'Pin',
    'Bell',
    'AlarmClock',
    'Clock',
    'Hourglass',
    'Gauge',
    'Rocket',
    'Rabbit',
    'Turtle',
    'Coffee',
    'Leaf',
    'Snowflake',
    'Circle',
    'CircleDot',
];

/** The icon every priority falls back to when its stored name is not a known lucide icon. */
export const DEFAULT_PRIORITY_ICON: keyof typeof icons = 'Flag';

export function resolvePriorityIcon(name: string): keyof typeof icons {
    return name in icons ? (name as keyof typeof icons) : DEFAULT_PRIORITY_ICON;
}
