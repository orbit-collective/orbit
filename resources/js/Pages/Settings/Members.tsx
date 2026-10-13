import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsMembersTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsMembersTab';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectDetails,
    ProjectMember,
} from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';
import { WorkspaceRole } from '@/types/Roles';

interface SettingsMembersProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    members?: ProjectMember[];
    pendingInvitations?: PendingProjectInvitation[];
    roles?: WorkspaceRole[];
    canAssignRoles?: boolean;
    canInviteMembers?: boolean;
    canUpdateMemberRoles?: boolean;
    canRemoveMembers?: boolean;
    canTransferOwnership?: boolean;
    selectedProjectDetails?: ProjectDetails | null;
    canUpdateProjectDetails?: boolean;
    canDeleteProject?: boolean;
}

export default function SettingsMembers({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    members = [],
    pendingInvitations = [],
    roles = [],
    canAssignRoles = false,
    canInviteMembers = false,
    canUpdateMemberRoles = false,
    canRemoveMembers = false,
    canTransferOwnership = false,
    selectedProjectDetails = null,
    canUpdateProjectDetails = false,
    canDeleteProject = false,
}: SettingsMembersProps) {
    return (
        <SettingsLayout tabId="members" projects={projects}>
            <WorkspaceSettingsMembersTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                members={members}
                pendingInvitations={pendingInvitations}
                roles={roles}
                canAssignRoles={canAssignRoles}
                canInviteMembers={canInviteMembers}
                canUpdateMemberRoles={canUpdateMemberRoles}
                canRemoveMembers={canRemoveMembers}
                canTransferOwnership={canTransferOwnership}
                selectedProjectDetails={selectedProjectDetails}
                canUpdateProjectDetails={canUpdateProjectDetails}
                canDeleteProject={canDeleteProject}
            />
        </SettingsLayout>
    );
}
