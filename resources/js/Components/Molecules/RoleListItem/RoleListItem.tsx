import { motion } from 'framer-motion';
import type { icons } from 'lucide-react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Icon from '@/Components/Atoms/Icon/Icon';
import ProgressRing from '@/Components/Atoms/ProgressRing/ProgressRing';
import SelectionHighlight from '@/Components/Atoms/SelectionHighlight/SelectionHighlight';
import { WorkspaceRole } from '@/types/Roles';
import { cn } from '@/utils/cn';
import { liftProps } from '@/utils/motion';

interface RoleListItemTheme {
    label: string;
    dot: string;
    ring: string;
    badgeClass: string;
    icon: keyof typeof icons;
}

interface RoleListItemProps {
    role: WorkspaceRole;
    theme: RoleListItemTheme;
    totalPermissions: number;
    selected: boolean;
    onClick: () => void;
}

export default function RoleListItem({
    role,
    theme,
    totalPermissions,
    selected,
    onClick,
}: RoleListItemProps) {
    const ratio =
        totalPermissions === 0
            ? 0
            : Math.round((role.permissionIds.length / totalPermissions) * 100);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            {...liftProps}
            className={cn(
                // No overflow-hidden: the highlight glides in from the previous role.
                'group relative w-full rounded-xl border border-(--border-color) bg-(--bg-color) p-3 text-left transition-[border-color,background-color] duration-200 hover:border-(--border-color-strong) hover:bg-(--bg-light-color-hover)',
            )}
        >
            {selected && (
                <SelectionHighlight
                    layoutId="role-list"
                    className="shadow-[0_0_0_1px_var(--accent-color)]"
                />
            )}

            <div className="relative flex items-center gap-2.5">
                <span
                    className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        theme.badgeClass,
                    )}
                >
                    <Icon name={theme.icon} size={14} />
                </span>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <p className="min-w-0 truncate text-sm font-medium text-(--text-color)">
                            {role.name}
                        </p>
                        {role.isSystem && (
                            <Icon
                                name="Lock"
                                size={11}
                                className="shrink-0 text-(--text-gray-color)"
                            />
                        )}
                    </div>
                    <p className="truncate text-[11px] text-(--text-gray-color)">
                        <AnimatedNumber value={role.memberCount} />{' '}
                        {role.memberCount === 1 ? 'member' : 'members'}
                    </p>
                </div>

                <div
                    className="flex shrink-0 flex-col items-center gap-1"
                    title={`${ratio}% of permissions granted`}
                >
                    <div className="relative">
                        <ProgressRing
                            radius={18}
                            stroke={3}
                            progress={ratio}
                            colorClass={theme.ring}
                            bgColorClass="stroke-(--bg-light-color)"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-(--text-color)">
                            <AnimatedNumber value={ratio} />
                        </span>
                    </div>
                    <span className="text-[8px] font-semibold tracking-wide text-(--text-gray-color) uppercase">
                        % perms
                    </span>
                </div>
            </div>
        </motion.button>
    );
}
