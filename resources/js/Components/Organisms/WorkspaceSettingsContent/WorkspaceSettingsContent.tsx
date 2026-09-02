import {
    ImportIntegrationSettings,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectDetails,
    ProjectMember,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import { WorkspaceSettingsTabId } from '@/types/Settings';
import WorkspaceSettingsDocumentsTab from './WorkspaceSettingsDocumentsTab';
import WorkspaceSettingsIntegrationsTab from './WorkspaceSettingsIntegrationsTab';
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
    canCreateRoles?: boolean;
    canUpdateRoles?: boolean;
    canDeleteRoles?: boolean;
    canAssignRoles?: boolean;
    hasSettingsAccess?: boolean;
    selectedProjectDetails?: ProjectDetails | null;
    canUpdateProjectDetails?: boolean;
    canDeleteProject?: boolean;
    integrationStatuses?: Record<string, boolean>;
    integrationSettings?: Record<string, ProjectIntegrationSettings>;
    jiraSettings?: ImportIntegrationSettings | null;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
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
    canCreateRoles = false,
    canUpdateRoles = false,
    canDeleteRoles = false,
    canAssignRoles = false,
    hasSettingsAccess = false,
    selectedProjectDetails = null,
    canUpdateProjectDetails = false,
    canDeleteProject = false,
    integrationStatuses = {},
    integrationSettings = {},
    jiraSettings = null,
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
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
                selectedProjectDetails={selectedProjectDetails}
                canUpdateProjectDetails={canUpdateProjectDetails}
                canDeleteProject={canDeleteProject}
            />
        );
    }

    if (tabId === 'integrations') {
        return (
            <WorkspaceSettingsIntegrationsTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                integrationStatuses={integrationStatuses}
                integrationSettings={integrationSettings}
                jiraSettings={jiraSettings}
                hasIntegrationsAccess={hasIntegrationsAccess}
                canUpdateIntegrations={canUpdateIntegrations}
            />
        );
    }

    return (
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
    );
}
