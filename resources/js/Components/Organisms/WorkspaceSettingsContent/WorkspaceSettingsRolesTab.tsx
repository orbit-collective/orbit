import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import {
    PermissionDefinition,
    RoleTypeValue,
    WorkspaceRole,
} from '@/types/Roles';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import {
    getPermissionDescription,
    getPermissionLabel,
    getPermissionSection,
} from '@/utils/permissions';
import { router } from '@inertiajs/react';
import { icons } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import WorkspaceSettingsCreateRoleModal from './WorkspaceSettingsCreateRoleModal';
import WorkspaceSettingsDeleteRoleModal from './WorkspaceSettingsDeleteRoleModal';

interface RoleTypeTheme {
    label: string;
    dot: string;
    badgeClass: string;
    icon: keyof typeof icons;
}

const ROLE_TYPE_THEME: Record<RoleTypeValue, RoleTypeTheme> = {
    owner: {
        label: 'Owner',
        dot: 'bg-amber-400',
        badgeClass: 'bg-amber-400/10 text-amber-400',
        icon: 'Crown',
    },
    admin: {
        label: 'Admin',
        dot: 'bg-emerald-400',
        badgeClass: 'bg-emerald-400/10 text-emerald-400',
        icon: 'ShieldCheck',
    },
    member: {
        label: 'Member',
        dot: 'bg-violet-400',
        badgeClass: 'bg-violet-400/10 text-violet-400',
        icon: 'User',
    },
    viewer: {
        label: 'Viewer',
        dot: 'bg-sky-400',
        badgeClass: 'bg-sky-400/10 text-sky-400',
        icon: 'Eye',
    },
    custom: {
        label: 'Custom',
        dot: 'bg-slate-400',
        badgeClass: 'bg-slate-400/10 text-slate-400',
        icon: 'Sparkles',
    },
};

const GROUP_META: Record<string, { label: string; icon: keyof typeof icons }> =
    {
        projects: { label: 'Project', icon: 'FolderKanban' },
        issues: { label: 'Issues', icon: 'ListTodo' },
        comments: { label: 'Comments', icon: 'MessageSquare' },
    };

interface PermissionSection {
    section: string;
    permissions: PermissionDefinition[];
}

interface PermissionGroup {
    group: string;
    label: string;
    icon: keyof typeof icons;
    sections: PermissionSection[];
    permissions: PermissionDefinition[];
}

function buildPermissionGroups(
    permissions: PermissionDefinition[],
): PermissionGroup[] {
    const groups = new Map<string, PermissionGroup>();

    permissions.forEach((permission) => {
        const meta = GROUP_META[permission.group] ?? {
            label: permission.group,
            icon: 'Key' as keyof typeof icons,
        };

        if (!groups.has(permission.group)) {
            groups.set(permission.group, {
                group: permission.group,
                label: meta.label,
                icon: meta.icon,
                sections: [],
                permissions: [],
            });
        }

        const group = groups.get(permission.group)!;
        group.permissions.push(permission);

        const sectionName = getPermissionSection(permission.key);
        let section = group.sections.find((s) => s.section === sectionName);
        if (!section) {
            section = { section: sectionName, permissions: [] };
            group.sections.push(section);
        }
        section.permissions.push(permission);
    });

    return Array.from(groups.values());
}

interface WorkspaceSettingsRolesTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    roles?: WorkspaceRole[];
    permissions?: PermissionDefinition[];
    canCreateRoles?: boolean;
    canUpdateRoles?: boolean;
    canDeleteRoles?: boolean;
    hasSettingsAccess?: boolean;
}

export default function WorkspaceSettingsRolesTab({
    memberProjects = [],
    selectedProjectId = null,
    roles = [],
    permissions = [],
    canCreateRoles = false,
    canUpdateRoles = false,
    canDeleteRoles = false,
    hasSettingsAccess = false,
}: WorkspaceSettingsRolesTabProps) {
    const { addAlert } = useAlert();

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings?tab=roles-management&project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const [localRoles, setLocalRoles] = useState<WorkspaceRole[]>(roles);
    useEffect(() => setLocalRoles(roles), [roles]);

    const [selectedRoleId, setSelectedRoleId] = useState<number | null>(
        roles[0]?.id ?? null,
    );
    useEffect(() => {
        if (!localRoles.some((role) => role.id === selectedRoleId)) {
            setSelectedRoleId(localRoles[0]?.id ?? null);
        }
    }, [localRoles, selectedRoleId]);

    const selectedRole =
        localRoles.find((role) => role.id === selectedRoleId) ?? null;

    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<WorkspaceRole | null>(
        null,
    );
    const [renameDraft, setRenameDraft] = useState<{
        name: string;
        slug: string;
    } | null>(null);
    const [isSavingRename, setIsSavingRename] = useState(false);

    const permissionGroups = useMemo(
        () => buildPermissionGroups(permissions),
        [permissions],
    );

    const filteredGroups = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return permissionGroups;
        }

        return permissionGroups
            .map((group) => ({
                ...group,
                sections: group.sections
                    .map((section) => ({
                        ...section,
                        permissions: section.permissions.filter(
                            (permission) =>
                                getPermissionLabel(permission)
                                    .toLowerCase()
                                    .includes(query) ||
                                permission.key.toLowerCase().includes(query),
                        ),
                    }))
                    .filter((section) => section.permissions.length > 0),
            }))
            .filter((group) => group.sections.length > 0);
    }, [permissionGroups, search]);

    const totalMembersGoverned = localRoles.reduce(
        (sum, role) => sum + role.memberCount,
        0,
    );

    const canEditSelectedRole =
        canUpdateRoles &&
        selectedRole !== null &&
        selectedRole.type !== 'owner';

    const togglePermission = (
        role: WorkspaceRole,
        permissionId: number,
        enabled: boolean,
    ) => {
        const previousIds = role.permissionIds;
        const nextIds = enabled
            ? [...previousIds, permissionId]
            : previousIds.filter((id) => id !== permissionId);

        setLocalRoles((prev) =>
            prev.map((entry) =>
                entry.id === role.id
                    ? { ...entry, permissionIds: nextIds }
                    : entry,
            ),
        );

        if (!selectedProjectId) {
            return;
        }

        router.patch(
            `/projects/${selectedProjectId}/roles/${role.id}/permissions`,
            { permissions: nextIds },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    addAlert("Couldn't update that permission.", 'error');
                    setLocalRoles((prev) =>
                        prev.map((entry) =>
                            entry.id === role.id
                                ? { ...entry, permissionIds: previousIds }
                                : entry,
                        ),
                    );
                },
            },
        );
    };

    const setSectionPermissions = (
        role: WorkspaceRole,
        sectionPermissions: PermissionDefinition[],
        enable: boolean,
    ) => {
        const previousIds = role.permissionIds;
        const sectionIds = sectionPermissions.map((p) => p.id);
        const nextIds = enable
            ? Array.from(new Set([...previousIds, ...sectionIds]))
            : previousIds.filter((id) => !sectionIds.includes(id));

        setLocalRoles((prev) =>
            prev.map((entry) =>
                entry.id === role.id
                    ? { ...entry, permissionIds: nextIds }
                    : entry,
            ),
        );

        if (!selectedProjectId) {
            return;
        }

        router.patch(
            `/projects/${selectedProjectId}/roles/${role.id}/permissions`,
            { permissions: nextIds },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    addAlert("Couldn't update those permissions.", 'error');
                    setLocalRoles((prev) =>
                        prev.map((entry) =>
                            entry.id === role.id
                                ? { ...entry, permissionIds: previousIds }
                                : entry,
                        ),
                    );
                },
            },
        );
    };

    const startRename = (role: WorkspaceRole) => {
        setRenameDraft({ name: role.name, slug: role.slug });
    };

    const saveRename = (role: WorkspaceRole) => {
        if (!renameDraft || !selectedProjectId) {
            return;
        }

        router.patch(
            `/projects/${selectedProjectId}/roles/${role.id}`,
            renameDraft,
            {
                preserveScroll: true,
                onStart: () => setIsSavingRename(true),
                onFinish: () => setIsSavingRename(false),
                onSuccess: () => {
                    addAlert('Role updated.', 'success');
                    setRenameDraft(null);
                },
                onError: (errors) => {
                    addAlert(
                        errors.name ?? errors.slug ?? 'Failed to update role.',
                        'error',
                    );
                },
            },
        );
    };

    if (!selectedProject) {
        return (
            <SettingsPanel
                title="Roles and permissions"
                description="Define granular roles and control exactly what each one can do."
                icon="Shield"
            >
                <SettingsPanelRow
                    title="You're not part of any project yet"
                    description="Create or join a project to manage its roles here."
                />
            </SettingsPanel>
        );
    }

    if (!hasSettingsAccess) {
        return (
            <SettingsPanel
                title="Roles and permissions"
                description="Define granular roles and control exactly what each one can do."
                icon="Shield"
            >
                <SettingsPanelRow
                    title="You don't have access to this project's settings"
                    description="Ask a project admin for the settings.view permission to see roles and permissions here."
                />
            </SettingsPanel>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    title="Custom roles"
                    value={localRoles.length}
                    icon="Shield"
                    color="accent"
                    description={`Defined for "${selectedProject.name}"`}
                />
                <StatCard
                    title="Permissions"
                    value={permissions.length}
                    icon="KeyRound"
                    color="info"
                    description="Granular capabilities available"
                />
                <StatCard
                    title="Members governed"
                    value={totalMembersGoverned}
                    icon="Users"
                    color={totalMembersGoverned > 0 ? 'success' : 'warning'}
                    description="Assignments across all custom roles"
                />
            </div>

            {memberProjects.length > 1 && (
                <SettingsPanel
                    title="Project"
                    description="Choose which project's roles to manage."
                    icon="FolderKanban"
                >
                    <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                        {memberProjects.map((project) => {
                            const theme = getColorTheme(project.color);
                            const selected = project.id === selectedProject.id;

                            return (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => switchProject(project.id)}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors',
                                        selected
                                            ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                                            : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--border-color-strong)]',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'h-2.5 w-2.5 shrink-0 rounded-full',
                                            theme.accent,
                                        )}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-color)]">
                                        {project.name}
                                    </span>
                                    {selected && (
                                        <Icon
                                            name="Check"
                                            size={14}
                                            className="shrink-0 text-[var(--accent-color)]"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </SettingsPanel>
            )}

            <SettingsPanel
                title="Custom roles"
                description="Define roles beyond the base Admin/Member access and grant them exactly the permissions they need."
                icon="Shield"
            >
                {localRoles.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                            <Icon name="ShieldPlus" size={22} />
                        </span>
                        <p className="text-sm font-medium text-[var(--text-color)]">
                            No custom roles yet
                        </p>
                        <p className="max-w-sm text-sm text-[var(--text-gray-color)]">
                            Create a role to grant a precise set of permissions
                            to members, on top of their base Admin/Member
                            access.
                        </p>
                        {canCreateRoles && (
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-1 flex items-center gap-1.5 rounded-md border border-dashed border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                            >
                                <Icon name="Plus" size={13} />
                                Create role
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
                            <div className="space-y-2 border-b border-[var(--border-color)] p-4 lg:border-b-0 lg:border-r">
                                {localRoles.map((role) => {
                                    const theme = ROLE_TYPE_THEME[role.type];
                                    const selected = role.id === selectedRoleId;

                                    return (
                                        <button
                                            key={role.id}
                                            type="button"
                                            onClick={() =>
                                                setSelectedRoleId(role.id)
                                            }
                                            className={cn(
                                                'w-full rounded-xl border p-3 text-left transition-colors',
                                                selected
                                                    ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                                                    : 'border-[var(--border-color)] bg-[var(--bg-color)] hover:border-[var(--border-color-strong)]',
                                            )}
                                        >
                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                <p className="min-w-0 truncate text-sm font-medium text-[var(--text-color)]">
                                                    {role.name}
                                                </p>
                                                {role.isSystem && (
                                                    <Icon
                                                        name="Lock"
                                                        size={12}
                                                        className="shrink-0 text-[var(--text-gray-color)]"
                                                    />
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
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
                                                <span className="text-[11px] text-[var(--text-gray-color)]">
                                                    {role.permissionIds.length}{' '}
                                                    perms
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}

                                {canCreateRoles && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsCreateModalOpen(true)
                                        }
                                        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--bg-light-color)] px-3 py-2.5 text-xs font-semibold text-[var(--text-gray-color)] transition-colors hover:border-[var(--border-color-strong)] hover:text-[var(--text-color)]"
                                    >
                                        <Icon name="Plus" size={13} />
                                        Create role
                                    </button>
                                )}
                            </div>

                            <div className="min-w-0">
                                {selectedRole && (
                                    <>
                                        <div className="flex flex-col gap-3 border-b border-[var(--border-color)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                            {renameDraft ? (
                                                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                                                    <Input
                                                        value={renameDraft.name}
                                                        onChange={(event) =>
                                                            setRenameDraft(
                                                                (prev) =>
                                                                    prev && {
                                                                        ...prev,
                                                                        name: event
                                                                            .target
                                                                            .value,
                                                                    },
                                                            )
                                                        }
                                                        placeholder="Role name"
                                                        className="sm:w-48"
                                                    />
                                                    {!selectedRole.isSystem && (
                                                        <Input
                                                            value={
                                                                renameDraft.slug
                                                            }
                                                            onChange={(event) =>
                                                                setRenameDraft(
                                                                    (prev) =>
                                                                        prev && {
                                                                            ...prev,
                                                                            slug: event
                                                                                .target
                                                                                .value,
                                                                        },
                                                                )
                                                            }
                                                            placeholder="slug"
                                                            className="sm:w-32"
                                                        />
                                                    )}
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            disabled={
                                                                isSavingRename
                                                            }
                                                            onClick={() =>
                                                                saveRename(
                                                                    selectedRole,
                                                                )
                                                            }
                                                            className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--accent-color)] text-[var(--text-color)] transition-opacity hover:opacity-90 disabled:opacity-50"
                                                        >
                                                            <Icon
                                                                name="Check"
                                                                size={14}
                                                            />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setRenameDraft(
                                                                    null,
                                                                )
                                                            }
                                                            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)]"
                                                        >
                                                            <Icon
                                                                name="X"
                                                                size={14}
                                                            />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    <span
                                                        className={cn(
                                                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                                            ROLE_TYPE_THEME[
                                                                selectedRole
                                                                    .type
                                                            ].badgeClass,
                                                        )}
                                                    >
                                                        <Icon
                                                            name={
                                                                ROLE_TYPE_THEME[
                                                                    selectedRole
                                                                        .type
                                                                ].icon
                                                            }
                                                            size={16}
                                                        />
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-[var(--text-color)]">
                                                            {selectedRole.name}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-gray-color)]">
                                                            {
                                                                selectedRole.memberCount
                                                            }{' '}
                                                            {selectedRole.memberCount ===
                                                            1
                                                                ? 'member'
                                                                : 'members'}{' '}
                                                            &middot; /
                                                            {selectedRole.slug}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {!renameDraft && (
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    {selectedRole.type ===
                                                    'owner' ? (
                                                        <span
                                                            className="flex items-center gap-1 text-xs text-[var(--text-gray-color)]"
                                                            title="The owner always has every permission and can't be changed."
                                                        >
                                                            <Icon
                                                                name="Lock"
                                                                size={12}
                                                            />
                                                            Owner role
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {canUpdateRoles && (
                                                                <button
                                                                    type="button"
                                                                    title="Rename role"
                                                                    onClick={() =>
                                                                        startRename(
                                                                            selectedRole,
                                                                        )
                                                                    }
                                                                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                                                                >
                                                                    <Icon
                                                                        name="Pencil"
                                                                        size={
                                                                            14
                                                                        }
                                                                    />
                                                                </button>
                                                            )}
                                                            {selectedRole.isSystem ? (
                                                                <span
                                                                    className="flex h-8 w-8 items-center justify-center text-[var(--text-gray-color)]"
                                                                    title="System roles can't be deleted."
                                                                >
                                                                    <Icon
                                                                        name="Lock"
                                                                        size={
                                                                            12
                                                                        }
                                                                    />
                                                                </span>
                                                            ) : (
                                                                canDeleteRoles && (
                                                                    <button
                                                                        type="button"
                                                                        title="Delete role"
                                                                        onClick={() =>
                                                                            setRoleToDelete(
                                                                                selectedRole,
                                                                            )
                                                                        }
                                                                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                                                                    >
                                                                        <Icon
                                                                            name="Trash2"
                                                                            size={
                                                                                14
                                                                            }
                                                                        />
                                                                    </button>
                                                                )
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="px-5 py-4">
                                            <Input
                                                value={search}
                                                onChange={(event) =>
                                                    setSearch(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search permissions..."
                                            />
                                        </div>

                                        <div className="max-h-[520px] space-y-5 overflow-y-auto px-5 pb-5">
                                            {filteredGroups.length === 0 && (
                                                <p className="py-6 text-center text-sm text-[var(--text-gray-color)]">
                                                    No permissions match "
                                                    {search}".
                                                </p>
                                            )}

                                            {filteredGroups.map((group) => {
                                                const groupPermissionIds =
                                                    group.permissions.map(
                                                        (p) => p.id,
                                                    );
                                                const enabledCount =
                                                    groupPermissionIds.filter(
                                                        (id) =>
                                                            selectedRole.permissionIds.includes(
                                                                id,
                                                            ),
                                                    ).length;
                                                const ratio =
                                                    groupPermissionIds.length ===
                                                    0
                                                        ? 0
                                                        : Math.round(
                                                              (enabledCount /
                                                                  groupPermissionIds.length) *
                                                                  100,
                                                          );

                                                return (
                                                    <div
                                                        key={group.group}
                                                        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-color)]"
                                                    >
                                                        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <Icon
                                                                    name={
                                                                        group.icon
                                                                    }
                                                                    size={14}
                                                                    className="text-[var(--text-gray-color)]"
                                                                />
                                                                <span className="text-sm font-semibold text-[var(--text-color)]">
                                                                    {
                                                                        group.label
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-[var(--text-gray-color)]">
                                                                    {
                                                                        enabledCount
                                                                    }
                                                                    /
                                                                    {
                                                                        groupPermissionIds.length
                                                                    }
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--bg-light-color)]">
                                                                    <div
                                                                        className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300"
                                                                        style={{
                                                                            width: `${ratio}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                                {canEditSelectedRole && (
                                                                    <div className="flex items-center gap-2 text-[11px] font-medium">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setSectionPermissions(
                                                                                    selectedRole,
                                                                                    group.permissions,
                                                                                    true,
                                                                                )
                                                                            }
                                                                            className="text-[var(--accent-color)] hover:underline"
                                                                        >
                                                                            All
                                                                        </button>
                                                                        <span className="text-[var(--text-gray-color)]">
                                                                            /
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setSectionPermissions(
                                                                                    selectedRole,
                                                                                    group.permissions,
                                                                                    false,
                                                                                )
                                                                            }
                                                                            className="text-[var(--text-gray-color)] hover:text-[var(--text-color)]"
                                                                        >
                                                                            None
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="divide-y divide-[var(--border-color)]">
                                                            {group.sections.map(
                                                                (section) => (
                                                                    <div
                                                                        key={
                                                                            section.section
                                                                        }
                                                                        className="px-4 py-3"
                                                                    >
                                                                        {section.section !==
                                                                            'General' && (
                                                                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-gray-color)]">
                                                                                {
                                                                                    section.section
                                                                                }
                                                                            </p>
                                                                        )}
                                                                        <div className="space-y-2.5">
                                                                            {section.permissions.map(
                                                                                (
                                                                                    permission,
                                                                                ) => (
                                                                                    <div
                                                                                        key={
                                                                                            permission.id
                                                                                        }
                                                                                        className="flex items-center justify-between gap-3"
                                                                                    >
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-sm text-[var(--text-color)]">
                                                                                                {getPermissionLabel(
                                                                                                    permission,
                                                                                                )}
                                                                                            </p>
                                                                                            <p className="text-xs text-[var(--text-gray-color)]">
                                                                                                {getPermissionDescription(
                                                                                                    permission,
                                                                                                )}
                                                                                            </p>
                                                                                        </div>
                                                                                        <ToggleSwitch
                                                                                            checked={selectedRole.permissionIds.includes(
                                                                                                permission.id,
                                                                                            )}
                                                                                            disabled={
                                                                                                !canEditSelectedRole
                                                                                            }
                                                                                            onChange={(
                                                                                                checked,
                                                                                            ) =>
                                                                                                togglePermission(
                                                                                                    selectedRole,
                                                                                                    permission.id,
                                                                                                    checked,
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </div>
                                                                                ),
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </SettingsPanel>

            {!canCreateRoles && !canUpdateRoles && !canDeleteRoles && (
                <SettingsPanel
                    title="Read-only access"
                    description="You can see how roles are configured, but you don't have permission to change them."
                    icon="Eye"
                >
                    <SettingsPanelRow
                        title="Ask a project admin"
                        description="Only members with the roles.create, roles.update or roles.delete permission can manage roles."
                    />
                </SettingsPanel>
            )}

            {selectedProjectId && (
                <>
                    <WorkspaceSettingsCreateRoleModal
                        isOpen={isCreateModalOpen}
                        onClose={() => setIsCreateModalOpen(false)}
                        projectId={selectedProjectId}
                    />
                    <WorkspaceSettingsDeleteRoleModal
                        role={roleToDelete}
                        projectId={selectedProjectId}
                        onClose={() => setRoleToDelete(null)}
                    />
                </>
            )}
        </div>
    );
}
