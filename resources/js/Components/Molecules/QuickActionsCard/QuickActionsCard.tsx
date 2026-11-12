import { motion } from 'framer-motion';
import type { icons } from 'lucide-react';
import { FC } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useCommandPalette } from '@/context/CommandContext';
import { cn } from '@/utils/cn';
import { requestOpenCommandPalette } from '@/utils/commandPaletteEvent';
import {
    DashboardColor,
    DASHBOARD_COLOR_VALUES,
} from '@/utils/dashboardColors';
import { FOCUS_RING } from '@/utils/focusRing';
import { DURATION, EASE, SPRING, rowDelay } from '@/utils/motion';

type QuickActionId =
    | 'newProject'
    | 'search'
    | 'projects'
    | 'notifications'
    | 'editDashboard'
    | 'shortcuts';

interface QuickAction {
    id: QuickActionId;
    label: string;
    icon: keyof typeof icons;
    /** The command to run; `null` opens the command palette. */
    command: string | null;
    /** How it is done from the keyboard, when it can be. */
    hint?: string;
}

/** Everything the widget can offer, in the order it is shown. */
export const QUICK_ACTIONS: QuickAction[] = [
    {
        id: 'newProject',
        label: 'New project',
        icon: 'FolderPlus',
        command: 'project.create',
    },
    {
        id: 'search',
        label: 'Search',
        icon: 'Search',
        command: null,
        hint: 'Ctrl K',
    },
    {
        id: 'projects',
        label: 'Projects',
        icon: 'FolderOpen',
        command: 'nav.projects',
        hint: 'G P',
    },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: 'Bell',
        command: 'nav.notifications',
        hint: 'G N',
    },
    {
        id: 'editDashboard',
        label: 'Edit dashboard',
        icon: 'PenLine',
        command: 'dashboard.edit',
    },
    {
        id: 'shortcuts',
        label: 'Shortcuts',
        icon: 'Keyboard',
        command: 'help.shortcuts',
        hint: '?',
    },
];

interface QuickActionsCardProps {
    /** `grid` of tiles, a `list` of rows with their keys, or a `bar` of buttons. */
    variant?: string;
    /** The actions that are on; every one by default. */
    enabled?: Partial<Record<QuickActionId, boolean>>;
    showHeader?: boolean;
    /** Say what each button does in words, not only with its icon. */
    showLabels?: boolean;
    color?: DashboardColor;
}

/** Shortcuts to what is done often: each runs a command of the command palette. */
const QuickActionsCard: FC<QuickActionsCardProps> = ({
    variant = 'grid',
    enabled,
    showHeader = true,
    showLabels = true,
    color = 'accent',
}) => {
    const { runCommand } = useCommandPalette();
    const tint = DASHBOARD_COLOR_VALUES[color];
    const actions = QUICK_ACTIONS.filter(
        (action) => enabled?.[action.id] !== false,
    );
    // An icon alone is not a name: it is spoken even when it is not shown.
    const iconOnly = variant === 'bar' && !showLabels;

    const run = (action: QuickAction) =>
        action.command === null
            ? requestOpenCommandPalette()
            : runCommand(action.command);

    const icon = (action: QuickAction, size: number) => (
        <motion.span
            variants={{
                rest: { rotate: 0, scale: 1 },
                hover: { rotate: -8, scale: 1.12 },
            }}
            transition={SPRING}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
                backgroundColor: `color-mix(in srgb, ${tint} 16%, transparent)`,
                color: tint,
            }}
        >
            <Icon name={action.icon} size={size} />
        </motion.span>
    );

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-solid border-(--border-color) bg-(--surface-color) p-4">
            {showHeader && (
                <h3 className="m-0 text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                    Quick Actions
                </h3>
            )}

            {actions.length === 0 ? (
                <p className="m-auto max-w-[16rem] text-center text-xs text-(--text-muted-color)">
                    No actions are on. Turn some on in the settings of this
                    widget.
                </p>
            ) : (
                <div
                    role="group"
                    aria-label="Quick actions"
                    className={cn(
                        'min-h-0 flex-1 overflow-y-auto',
                        variant === 'list' && 'flex flex-col gap-1',
                        variant === 'bar' &&
                            'flex flex-wrap content-start gap-2',
                        variant === 'grid' && 'grid content-start gap-2.5',
                    )}
                    style={
                        variant === 'grid'
                            ? {
                                  gridTemplateColumns:
                                      'repeat(auto-fill, minmax(7.5rem, 1fr))',
                              }
                            : undefined
                    }
                >
                    {actions.map((action, index) => (
                        <motion.button
                            key={action.id}
                            type="button"
                            aria-label={iconOnly ? action.label : undefined}
                            title={action.label}
                            onClick={() => run(action)}
                            initial="rest"
                            whileHover="hover"
                            whileTap={{ scale: 0.97 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                                duration: DURATION.base,
                                ease: EASE,
                                delay: rowDelay(index),
                            }}
                            className={cn(
                                'group flex min-h-11 cursor-pointer items-center gap-2.5 border border-solid border-(--border-color) bg-(--bg-color-hover) text-left text-sm font-medium text-(--text-color) transition-colors hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover)',
                                FOCUS_RING,
                                variant === 'grid' &&
                                    'flex-col justify-center gap-2 rounded-xl px-3 py-3 text-center',
                                variant === 'list' &&
                                    'w-full justify-between rounded-lg border-transparent bg-transparent px-2 py-1.5 hover:bg-(--bg-light-color)',
                                variant === 'bar' && 'rounded-xl px-2.5 py-1.5',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex min-w-0 items-center gap-2.5',
                                    variant === 'grid' && 'flex-col gap-2',
                                )}
                            >
                                {icon(action, 16)}
                                {(variant !== 'bar' || showLabels) && (
                                    <span className="truncate">
                                        {action.label}
                                    </span>
                                )}
                            </span>
                            {variant === 'list' && action.hint && (
                                <kbd className="shrink-0 rounded-sm border border-solid border-(--border-color) bg-(--bg-light-color) px-1.5 font-mono text-[10px] font-bold text-(--text-gray-color)">
                                    {action.hint}
                                </kbd>
                            )}
                        </motion.button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuickActionsCard;
