import Icon from '@/Components/Atoms/Icon/Icon';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import RoleDetailHeader from '@/Components/Molecules/RoleDetailHeader/RoleDetailHeader';
import RolePermissionsList from '@/Components/Molecules/RolePermissionsList/RolePermissionsList';
import RoleSidebar from '@/Components/Molecules/RoleSidebar/RoleSidebar';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useRolesManagement } from '@/hooks/useRolesManagement';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import { router } from '@inertiajs/react';
import WorkspaceSettingsCreateRoleModal from './WorkspaceSettingsCreateRoleModal';
import WorkspaceSettingsDeleteRoleModal from './WorkspaceSettingsDeleteRoleModal';

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

    const {
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
    } = useRolesManagement({
        roles,
        permissions,
        selectedProjectId,
        canUpdateRoles,
    });

    if (!selectedProject || !hasSettingsAccess) {
        return (
            <SettingsPanel
                title="Roles and permissions"
                description="Define granular roles and control exactly what each one can do."
                icon="Shield"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? "You're not part of any project yet"
                            : "You don't have access to this project's settings"
                    }
                    description={
                        !selectedProject
                            ? 'Create or join a project to manage its roles here.'
                            : 'Ask a project admin for the settings.view permission to see roles and permissions here.'
                    }
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

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's roles to manage."
                onSelect={switchProject}
            />

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
                    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
                        <RoleSidebar
                            roles={localRoles}
                            selectedRoleId={selectedRoleId}
                            totalPermissions={permissions.length}
                            canCreateRoles={canCreateRoles}
                            onSelect={setSelectedRoleId}
                            onCreateRequest={() => setIsCreateModalOpen(true)}
                        />

                        <div className="min-w-0">
                            {selectedRole && (
                                <>
                                    <RoleDetailHeader
                                        role={selectedRole}
                                        ratio={selectedRoleRatio}
                                        renameDraft={renameDraft}
                                        isSavingRename={isSavingRename}
                                        canUpdateRoles={canUpdateRoles}
                                        canDeleteRoles={canDeleteRoles}
                                        onRenameDraftChange={setRenameDraft}
                                        onStartRename={() =>
                                            startRename(selectedRole)
                                        }
                                        onSaveRename={() =>
                                            saveRename(selectedRole)
                                        }
                                        onCancelRename={() =>
                                            setRenameDraft(null)
                                        }
                                        onDeleteRequest={() =>
                                            setRoleToDelete(selectedRole)
                                        }
                                    />

                                    <RolePermissionsList
                                        groups={filteredGroups}
                                        search={search}
                                        onSearchChange={setSearch}
                                        enabledIds={selectedRole.permissionIds}
                                        canEdit={canEditSelectedRole}
                                        onToggle={(permissionId, enabled) =>
                                            togglePermission(
                                                selectedRole,
                                                permissionId,
                                                enabled,
                                            )
                                        }
                                        onSetAll={(perms, enable) =>
                                            setSectionPermissions(
                                                selectedRole,
                                                perms,
                                                enable,
                                            )
                                        }
                                    />
                                </>
                            )}
                        </div>
                    </div>
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
