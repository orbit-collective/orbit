import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsMembersTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsMembersTab';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectDetails,
    ProjectMember,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';
import { WorkspaceRole } from '@/types/Roles';

interface SettingsMembersProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    viewerRole?: ProjectMemberRole | null;
    members?: ProjectMember[];
    pendingInvitations?: PendingProjectInvitation[];
    roles?: WorkspaceRole[];
    canAssignRoles?: boolean;
    selectedProjectDetails?: ProjectDetails | null;
    canUpdateProjectDetails?: boolean;
    canDeleteProject?: boolean;
}

export default function SettingsMembers({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    viewerRole = null,
    members = [],
    pendingInvitations = [],
    roles = [],
    canAssignRoles = false,
    selectedProjectDetails = null,
    canUpdateProjectDetails = false,
    canDeleteProject = false,
}: SettingsMembersProps) {
    return (
        <SettingsLayout tabId="members" projects={projects}>
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
        </SettingsLayout>
    );
}
