import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Icon from '@/Components/Atoms/Icon/Icon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
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
import { riseIn } from '@/utils/motion';
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
    const { t, tChoice } = useLaravelReactI18n();
    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings/roles-management?project=${projectId}`,
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
                id="roles"
                title={t('workspace_settings_roles.title')}
                description={t('workspace_settings_roles.description')}
                icon="Shield"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? t('workspace_settings_roles.no_project')
                            : t('workspace_settings_roles.no_access')
                    }
                    description={
                        !selectedProject
                            ? t('workspace_settings_roles.no_project_hint')
                            : t('workspace_settings_roles.no_access_hint')
                    }
                />
            </SettingsPanel>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <motion.div variants={riseIn}>
                    <StatCard
                        title={t('workspace_settings_roles.custom_roles')}
                        value={<AnimatedNumber value={localRoles.length} />}
                        icon="Shield"
                        color="accent"
                        variant="vivid"
                        description={t('workspace_settings_roles.defined_for', {
                            project: selectedProject.name,
                        })}
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        title={t('workspace_settings_roles.permissions')}
                        value={<AnimatedNumber value={permissions.length} />}
                        icon="KeyRound"
                        color="info"
                        variant="vivid"
                        description={t(
                            'workspace_settings_roles.permissions_hint',
                        )}
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        title={t('workspace_settings_roles.governed')}
                        value={<AnimatedNumber value={totalMembersGoverned} />}
                        icon="Users"
                        color={totalMembersGoverned > 0 ? 'success' : 'warning'}
                        variant="vivid"
                        description={t(
                            'workspace_settings_roles.governed_hint',
                        )}
                    />
                </motion.div>
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description={t('workspace_settings_roles.picker_description')}
                onSelect={switchProject}
            />

            <SettingsPanel
                id="roles"
                collapsedSummary={tChoice(
                    'workspace_settings_roles.summary',
                    localRoles.length,
                )}
                title={t('workspace_settings_roles.custom_roles')}
                description={t('workspace_settings_roles.panel_description')}
                icon="Shield"
            >
                {localRoles.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-(--accent-color-opacity) text-(--accent-color)">
                            <Icon name="ShieldPlus" size={22} />
                        </span>
                        <p className="text-sm font-medium text-(--text-color)">
                            {t('workspace_settings_roles.empty_title')}
                        </p>
                        <p className="max-w-sm text-sm text-(--text-gray-color)">
                            {t('workspace_settings_roles.empty_description')}
                        </p>
                        {canCreateRoles && (
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="mt-1 flex items-center gap-1.5 rounded-md border border-dashed border-(--bg-light-color) px-3 py-1.5 text-xs font-semibold text-(--text-color) transition-colors hover:border-(--border-color-strong)"
                            >
                                <Icon name="Plus" size={13} />
                                {t('workspace_settings_roles.create')}
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
                                <Reveal key={selectedRole.id}>
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
                                </Reveal>
                            )}
                        </div>
                    </div>
                )}
            </SettingsPanel>

            {!canCreateRoles && !canUpdateRoles && !canDeleteRoles && (
                <SettingsPanel
                    id="read-only"
                    title={t('workspace_settings_roles.read_only_title')}
                    description={t(
                        'workspace_settings_roles.read_only_description',
                    )}
                    icon="Eye"
                >
                    <SettingsPanelRow
                        title={t(
                            'workspace_settings_roles.read_only_row_title',
                        )}
                        description={t(
                            'workspace_settings_roles.read_only_row_description',
                        )}
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
