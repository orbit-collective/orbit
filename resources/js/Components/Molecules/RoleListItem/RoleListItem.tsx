import Icon from '@/Components/Atoms/Icon/Icon';
import ProgressRing from '@/Components/Atoms/ProgressRing/ProgressRing';
import { WorkspaceRole } from '@/types/Roles';
import { cn } from '@/utils/cn';
import { icons } from 'lucide-react';

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
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-all duration-200',
                selected
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)] shadow-[0_0_0_1px_var(--accent-color)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--border-color-strong)] hover:bg-[var(--bg-light-color-hover)]',
            )}
        >
            {selected && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-[var(--accent-color)]" />
            )}

            <div className="flex items-center gap-2.5">
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
                        <p className="min-w-0 truncate text-sm font-medium text-[var(--text-color)]">
                            {role.name}
                        </p>
                        {role.isSystem && (
                            <Icon
                                name="Lock"
                                size={11}
                                className="shrink-0 text-[var(--text-gray-color)]"
                            />
                        )}
                    </div>
                    <p className="truncate text-[11px] text-[var(--text-gray-color)]">
                        {role.memberCount}{' '}
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
                            bgColorClass="stroke-[var(--bg-light-color)]"
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--text-color)]">
                            {ratio}
                        </span>
                    </div>
                    <span className="text-[8px] font-semibold uppercase tracking-wide text-[var(--text-gray-color)]">
                        % perms
                    </span>
                </div>
            </div>
        </button>
    );
}
