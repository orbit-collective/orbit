import DangerZonePanel from '@/Components/Molecules/DangerZonePanel/DangerZonePanel';
import InviteByEmailPanel from '@/Components/Molecules/InviteByEmailPanel/InviteByEmailPanel';
import JoinWithCodePanel from '@/Components/Molecules/JoinWithCodePanel/JoinWithCodePanel';
import MemberList from '@/Components/Molecules/MemberList/MemberList';
import OwnershipPanel from '@/Components/Molecules/OwnershipPanel/OwnershipPanel';
import PendingInvitationsPanel from '@/Components/Molecules/PendingInvitationsPanel/PendingInvitationsPanel';
import ProjectDetailsForm from '@/Components/Molecules/ProjectDetailsForm/ProjectDetailsForm';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useMembersManagement } from '@/hooks/useMembersManagement';
import { PageProps } from '@/types';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectDetails,
    ProjectMember,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import { usePage } from '@inertiajs/react';
import WorkspaceSettingsDeleteProjectModal from './WorkspaceSettingsDeleteProjectModal';
import WorkspaceSettingsTransferOwnershipModal from './WorkspaceSettingsTransferOwnershipModal';

interface WorkspaceSettingsMembersTabProps {
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

export default function WorkspaceSettingsMembersTab({
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
}: WorkspaceSettingsMembersTabProps) {
    const { props } = usePage<PageProps>();
    const emailEnabled = props.emailEnabled;
    const isManager = viewerRole === 'owner' || viewerRole === 'admin';
    const assignableRoles = roles.filter((role) => !role.isSystem);

    const {
        selectedProject,
        switchProject,
        managerCount,
        isTransferOwnershipModalOpen,
        setIsTransferOwnershipModalOpen,
        isDeleteProjectModalOpen,
        setIsDeleteProjectModalOpen,
        projectDetailsDraft,
        setProjectDetailsDraft,
        isSavingDetails,
        saveProjectDetails,
        inviteEmail,
        setInviteEmail,
        inviteRole,
        setInviteRole,
        inviteRoleIds,
        inviteError,
        isInviting,
        toggleInviteRoleId,
        submitInvite,
        invitationToken,
        setInvitationToken,
        tokenError,
        isJoining,
        submitManualAccept,
        changeMemberRole,
        toggleMemberCustomRole,
        removeMember,
        revokeInvitation,
    } = useMembersManagement({
        memberProjects,
        selectedProjectId,
        selectedProjectDetails,
        members,
    });

    if (!selectedProject) {
        return (
            <SettingsPanel
                title="Members"
                description="View and manage the people who have access to your projects."
                icon="Users"
            >
                <SettingsPanelRow
                    title="You're not part of any project yet"
                    description="Create or join a project to manage its members here."
                />
            </SettingsPanel>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard
                    title="Team members"
                    value={members.length}
                    icon="Users"
                    color="accent"
                    description={`Across "${selectedProject.name}"`}
                />
                <StatCard
                    title="Managers"
                    value={managerCount}
                    icon="ShieldCheck"
                    color="info"
                    description="Can manage members & invites"
                />
                <StatCard
                    title="Pending invites"
                    value={pendingInvitations.length}
                    icon="Mail"
                    color="warning"
                    description={
                        emailEnabled
                            ? 'Awaiting a response'
                            : 'Invitations are disabled'
                    }
                />
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's members to manage."
                onSelect={switchProject}
            />

            <SettingsPanel
                title="Members"
                description={`People with access to "${selectedProject.name}".`}
                icon="Users"
            >
                <MemberList
                    members={members}
                    isManager={isManager}
                    canAssignRoles={canAssignRoles}
                    assignableRoles={assignableRoles}
                    onChangeRole={changeMemberRole}
                    onToggleCustomRole={toggleMemberCustomRole}
                    onRemove={removeMember}
                />
            </SettingsPanel>

            {canUpdateProjectDetails && projectDetailsDraft && (
                <SettingsPanel
                    title="Project details"
                    description="Rename the project, update its description, or change its color."
                    icon="FolderCog"
                >
                    <ProjectDetailsForm
                        draft={projectDetailsDraft}
                        isSaving={isSavingDetails}
                        onChange={setProjectDetailsDraft}
                        onSubmit={saveProjectDetails}
                    />
                </SettingsPanel>
            )}

            {viewerRole === 'owner' && (
                <OwnershipPanel
                    onTransferRequest={() =>
                        setIsTransferOwnershipModalOpen(true)
                    }
                />
            )}

            {canDeleteProject && (
                <DangerZonePanel
                    projectName={selectedProject.name}
                    onDeleteRequest={() => setIsDeleteProjectModalOpen(true)}
                />
            )}

            <InviteByEmailPanel
                emailEnabled={!!emailEnabled}
                isManager={isManager}
                canAssignRoles={canAssignRoles}
                assignableRoles={assignableRoles}
                email={inviteEmail}
                role={inviteRole}
                roleIds={inviteRoleIds}
                error={inviteError}
                isInviting={isInviting}
                onEmailChange={setInviteEmail}
                onRoleChange={setInviteRole}
                onToggleRoleId={toggleInviteRoleId}
                onSubmit={submitInvite}
            />

            {emailEnabled && isManager && (
                <PendingInvitationsPanel
                    invitations={pendingInvitations}
                    assignableRoles={assignableRoles}
                    onRevoke={revokeInvitation}
                />
            )}

            <JoinWithCodePanel
                token={invitationToken}
                error={tokenError}
                isJoining={isJoining}
                onChange={setInvitationToken}
                onSubmit={submitManualAccept}
            />

            {viewerRole === 'owner' && (
                <WorkspaceSettingsTransferOwnershipModal
                    isOpen={isTransferOwnershipModalOpen}
                    onClose={() => setIsTransferOwnershipModalOpen(false)}
                    projectId={selectedProject.id}
                    members={members}
                />
            )}

            {canDeleteProject && (
                <WorkspaceSettingsDeleteProjectModal
                    isOpen={isDeleteProjectModalOpen}
                    onClose={() => setIsDeleteProjectModalOpen(false)}
                    projectId={selectedProject.id}
                    projectName={selectedProject.name}
                />
            )}
        </div>
    );
}
