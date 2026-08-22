import { useAlert } from '@/context/AlertContext';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import { buildPermissionGroups } from '@/utils/permissionGroups';
import { getPermissionLabel } from '@/utils/permissions';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

interface UseRolesManagementArgs {
    roles: WorkspaceRole[];
    permissions: PermissionDefinition[];
    selectedProjectId: number | null;
    canUpdateRoles: boolean;
}

export function useRolesManagement({
    roles,
    permissions,
    selectedProjectId,
    canUpdateRoles,
}: UseRolesManagementArgs) {
    const { addAlert } = useAlert();

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

    const selectedRoleRatio =
        selectedRole === null || permissions.length === 0
            ? 0
            : Math.round(
                  (selectedRole.permissionIds.length / permissions.length) *
                      100,
              );

    const updateRolePermissionIds = (roleId: number, nextIds: number[]) => {
        setLocalRoles((prev) =>
            prev.map((entry) =>
                entry.id === roleId
                    ? { ...entry, permissionIds: nextIds }
                    : entry,
            ),
        );
    };

    const patchPermissions = (
        role: WorkspaceRole,
        nextIds: number[],
        previousIds: number[],
        errorMessage: string,
    ) => {
        updateRolePermissionIds(role.id, nextIds);

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
                    addAlert(errorMessage, 'error');
                    updateRolePermissionIds(role.id, previousIds);
                },
            },
        );
    };

    const togglePermission = (
        role: WorkspaceRole,
        permissionId: number,
        enabled: boolean,
    ) => {
        const previousIds = role.permissionIds;
        const nextIds = enabled
            ? [...previousIds, permissionId]
            : previousIds.filter((id) => id !== permissionId);

        patchPermissions(
            role,
            nextIds,
            previousIds,
            "Couldn't update that permission.",
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

        patchPermissions(
            role,
            nextIds,
            previousIds,
            "Couldn't update those permissions.",
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

    return {
        localRoles,
        selectedRoleId,
        setSelectedRoleId,
        selectedRole,
        search,
        setSearch,
        isCreateModalOpen,
        setIsCreateModalOpen,
        roleToDelete,
        setRoleToDelete,
        renameDraft,
        setRenameDraft,
        isSavingRename,
        filteredGroups,
        totalMembersGoverned,
        canEditSelectedRole,
        selectedRoleRatio,
        togglePermission,
        setSectionPermissions,
        startRename,
        saveRename,
    };
}
