import { usePage } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
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
} from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import { riseIn } from '@/utils/motion';
import WorkspaceSettingsDeleteProjectModal from './WorkspaceSettingsDeleteProjectModal';
import WorkspaceSettingsTransferOwnershipModal from './WorkspaceSettingsTransferOwnershipModal';

interface WorkspaceSettingsMembersTabProps {
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

export default function WorkspaceSettingsMembersTab({
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
}: WorkspaceSettingsMembersTabProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const { props } = usePage<PageProps>();
    const emailEnabled = props.emailEnabled;
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
                id="members"
                title={t('workspace_settings_members.title')}
                description={t('workspace_settings_members.description')}
                icon="Users"
            >
                <SettingsPanelRow
                    title={t('workspace_settings_members.no_project')}
                    description={t(
                        'workspace_settings_members.no_project_hint',
                    )}
                />
            </SettingsPanel>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <motion.div variants={riseIn}>
                    <StatCard
                        title={t('workspace_settings_members.team_members')}
                        value={<AnimatedNumber value={members.length} />}
                        icon="Users"
                        color="accent"
                        variant="vivid"
                        description={t('workspace_settings_members.across', {
                            project: selectedProject.name,
                        })}
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        title={t('workspace_settings_members.managers')}
                        value={<AnimatedNumber value={managerCount} />}
                        icon="ShieldCheck"
                        color="info"
                        variant="vivid"
                        description={t(
                            'workspace_settings_members.managers_hint',
                        )}
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        title={t('workspace_settings_members.pending')}
                        value={
                            <AnimatedNumber value={pendingInvitations.length} />
                        }
                        icon="Mail"
                        color="warning"
                        variant="vivid"
                        description={
                            emailEnabled
                                ? t(
                                      'workspace_settings_members.pending_awaiting',
                                  )
                                : t(
                                      'workspace_settings_members.pending_disabled',
                                  )
                        }
                    />
                </motion.div>
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description={t('workspace_settings_members.picker_description')}
                onSelect={switchProject}
            />

            <SettingsPanel
                id="members"
                collapsedSummary={tChoice(
                    'workspace_settings_members.summary',
                    members.length,
                )}
                title={t('workspace_settings_members.title')}
                description={t('workspace_settings_members.panel_description', {
                    project: selectedProject.name,
                })}
                icon="Users"
            >
                <MemberList
                    members={members}
                    canUpdateRoles={canUpdateMemberRoles}
                    canRemoveMembers={canRemoveMembers}
                    canAssignRoles={canAssignRoles}
                    assignableRoles={assignableRoles}
                    onChangeRole={changeMemberRole}
                    onToggleCustomRole={toggleMemberCustomRole}
                    onRemove={removeMember}
                />
            </SettingsPanel>

            {canUpdateProjectDetails && projectDetailsDraft && (
                <SettingsPanel
                    id="project-details"
                    collapsedSummary={selectedProject.name}
                    title={t('workspace_settings_members.details_title')}
                    description={t(
                        'workspace_settings_members.details_description',
                    )}
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

            {canTransferOwnership && (
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
                emailEnabled={emailEnabled}
                canInvite={canInviteMembers}
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

            {emailEnabled && canInviteMembers && (
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

            {canTransferOwnership && (
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
