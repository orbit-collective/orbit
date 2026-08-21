import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectMember,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import { WorkspaceSettingsTabId } from '@/types/Settings';
import WorkspaceSettingsDocumentsTab from './WorkspaceSettingsDocumentsTab';
import WorkspaceSettingsLabelsTab from './WorkspaceSettingsLabelsTab';
import WorkspaceSettingsMembersTab from './WorkspaceSettingsMembersTab';
import WorkspaceSettingsPrioritiesTab from './WorkspaceSettingsPrioritiesTab';
import WorkspaceSettingsRolesTab from './WorkspaceSettingsRolesTab';
import WorkspaceSettingsStatusesTab from './WorkspaceSettingsStatusesTab';
import WorkspaceSettingsTemplatesTab from './WorkspaceSettingsTemplatesTab';

interface WorkspaceSettingsContentProps {
    tabId: WorkspaceSettingsTabId;
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    viewerRole?: ProjectMemberRole | null;
    members?: ProjectMember[];
    pendingInvitations?: PendingProjectInvitation[];
    roles?: WorkspaceRole[];
    permissions?: PermissionDefinition[];
    canManageRoles?: boolean;
    canAssignRoles?: boolean;
}

export default function WorkspaceSettingsContent({
    tabId,
    memberProjects = [],
    selectedProjectId = null,
    viewerRole = null,
    members = [],
    pendingInvitations = [],
    roles = [],
    permissions = [],
    canManageRoles = false,
    canAssignRoles = false,
}: WorkspaceSettingsContentProps) {
    if (tabId === 'labels') {
        return <WorkspaceSettingsLabelsTab />;
    }

    if (tabId === 'statuses') {
        return <WorkspaceSettingsStatusesTab />;
    }

    if (tabId === 'priorities') {
        return <WorkspaceSettingsPrioritiesTab />;
    }

    if (tabId === 'templates') {
        return <WorkspaceSettingsTemplatesTab />;
    }

    if (tabId === 'documents') {
        return <WorkspaceSettingsDocumentsTab />;
    }

    if (tabId === 'members') {
        return (
            <WorkspaceSettingsMembersTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                viewerRole={viewerRole}
                members={members}
                pendingInvitations={pendingInvitations}
                roles={roles}
                canAssignRoles={canAssignRoles}
            />
        );
    }

    return (
        <WorkspaceSettingsRolesTab
            memberProjects={memberProjects}
            selectedProjectId={selectedProjectId}
            roles={roles}
            permissions={permissions}
            canManageRoles={canManageRoles}
        />
    );
}
