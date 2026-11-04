import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsRolesTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsRolesTab';
import { useSettingsLive } from '@/live/useSettingsLive';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';

interface SettingsRolesManagementProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    roles?: WorkspaceRole[];
    permissions?: PermissionDefinition[];
    canCreateRoles?: boolean;
    canUpdateRoles?: boolean;
    canDeleteRoles?: boolean;
    hasSettingsAccess?: boolean;
}

export default function SettingsRolesManagement({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    roles = [],
    permissions = [],
    canCreateRoles = false,
    canUpdateRoles = false,
    canDeleteRoles = false,
    hasSettingsAccess = false,
}: SettingsRolesManagementProps) {
    // Other admins' changes to this project's settings arrive live.
    useSettingsLive(selectedProjectId);

    return (
        <SettingsLayout tabId="roles-management" projects={projects}>
            <WorkspaceSettingsRolesTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                roles={roles}
                permissions={permissions}
                canCreateRoles={canCreateRoles}
                canUpdateRoles={canUpdateRoles}
                canDeleteRoles={canDeleteRoles}
                hasSettingsAccess={hasSettingsAccess}
            />
        </SettingsLayout>
    );
}
