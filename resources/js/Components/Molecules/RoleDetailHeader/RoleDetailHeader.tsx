import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import ProgressRing from '@/Components/Atoms/ProgressRing/ProgressRing';
import { WorkspaceRole } from '@/types/Roles';
import { cn } from '@/utils/cn';
import { ROLE_TYPE_THEME } from '@/utils/roleTheme';

interface RenameDraft {
    name: string;
    slug: string;
}

interface RoleDetailHeaderProps {
    role: WorkspaceRole;
    ratio: number;
    renameDraft: RenameDraft | null;
    isSavingRename: boolean;
    canUpdateRoles: boolean;
    canDeleteRoles: boolean;
    onRenameDraftChange: (draft: RenameDraft) => void;
    onStartRename: () => void;
    onSaveRename: () => void;
    onCancelRename: () => void;
    onDeleteRequest: () => void;
}

export default function RoleDetailHeader({
    role,
    ratio,
    renameDraft,
    isSavingRename,
    canUpdateRoles,
    canDeleteRoles,
    onRenameDraftChange,
    onStartRename,
    onSaveRename,
    onCancelRename,
    onDeleteRequest,
}: RoleDetailHeaderProps) {
    const theme = ROLE_TYPE_THEME[role.type];

    return (
        <div className="flex flex-col gap-3 border-b border-[var(--border-color)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            {renameDraft ? (
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                        value={renameDraft.name}
                        onChange={(event) =>
                            onRenameDraftChange({
                                ...renameDraft,
                                name: event.target.value,
                            })
                        }
                        placeholder="Role name"
                        className="sm:w-48"
                    />
                    {!role.isSystem && (
                        <Input
                            value={renameDraft.slug}
                            onChange={(event) =>
                                onRenameDraftChange({
                                    ...renameDraft,
                                    slug: event.target.value,
                                })
                            }
                            placeholder="slug"
                            className="sm:w-32"
                        />
                    )}
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            disabled={isSavingRename}
                            onClick={onSaveRename}
                            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-color)] text-[var(--text-color)] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            <Icon name="Check" size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={onCancelRename}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)]"
                        >
                            <Icon name="X" size={14} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                        <ProgressRing
                            radius={22}
                            stroke={2.5}
                            progress={ratio}
                            colorClass={theme.ring}
                            bgColorClass="stroke-[var(--bg-light-color)]"
                        />
                        <span
                            className={cn(
                                'absolute inset-[3px] flex items-center justify-center rounded-full bg-gradient-to-br',
                                theme.gradient,
                                theme.badgeClass,
                            )}
                        >
                            <Icon name={theme.icon} size={15} />
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-color)]">
                            {role.name}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-[var(--text-gray-color)]">
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium',
                                    theme.badgeClass,
                                )}
                            >
                                <span
                                    className={cn(
                                        'h-1.5 w-1.5 rounded-full',
                                        theme.dot,
                                    )}
                                />
                                {theme.label}
                            </span>
                            <span>
                                {role.memberCount}{' '}
                                {role.memberCount === 1 ? 'member' : 'members'}
                            </span>
                            <span>&middot; /{role.slug}</span>
                        </p>
                    </div>
                </div>
            )}

            {!renameDraft && (
                <div className="flex shrink-0 items-center gap-1.5">
                    {role.type === 'owner' ? (
                        <span
                            className="flex items-center gap-1 text-xs text-[var(--text-gray-color)]"
                            title="The owner always has every permission and can't be changed."
                        >
                            <Icon name="Lock" size={12} />
                            Owner role
                        </span>
                    ) : (
                        <>
                            {canUpdateRoles && (
                                <button
                                    type="button"
                                    title="Rename role"
                                    onClick={onStartRename}
                                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                                >
                                    <Icon name="Pencil" size={14} />
                                </button>
                            )}
                            {role.isSystem ? (
                                <span
                                    className="flex h-8 w-8 items-center justify-center text-[var(--text-gray-color)]"
                                    title="System roles can't be deleted."
                                >
                                    <Icon name="Lock" size={12} />
                                </span>
                            ) : (
                                canDeleteRoles && (
                                    <button
                                        type="button"
                                        title="Delete role"
                                        onClick={onDeleteRequest}
                                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        <Icon name="Trash2" size={14} />
                                    </button>
                                )
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
