import { useAlert } from '@/context/AlertContext';
import {
    AssignableProjectMemberRole,
    MemberProjectSummary,
    ProjectDetails,
    ProjectMember,
} from '@/types/ProjectMembers';
import { router } from '@inertiajs/react';
import { SyntheticEvent, useEffect, useState } from 'react';

interface UseMembersManagementArgs {
    memberProjects: MemberProjectSummary[];
    selectedProjectId: number | null;
    selectedProjectDetails: ProjectDetails | null;
    members: ProjectMember[];
}

export function useMembersManagement({
    memberProjects,
    selectedProjectId,
    selectedProjectDetails,
    members,
}: UseMembersManagementArgs) {
    const { addAlert } = useAlert();

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        router.get(
            `/settings?tab=members&project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    const managerCount = members.filter(
        (member) => member.role === 'owner' || member.role === 'admin',
    ).length;

    const [isTransferOwnershipModalOpen, setIsTransferOwnershipModalOpen] =
        useState(false);
    const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] =
        useState(false);

    const [projectDetailsDraft, setProjectDetailsDraft] =
        useState<ProjectDetails | null>(selectedProjectDetails);
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    useEffect(() => {
        setProjectDetailsDraft(selectedProjectDetails);
    }, [selectedProjectDetails]);

    const saveProjectDetails = (event: SyntheticEvent) => {
        event.preventDefault();
        if (!selectedProjectId || !projectDetailsDraft) {
            return;
        }

        router.patch(
            `/projects/${selectedProjectId}/details`,
            {
                name: projectDetailsDraft.name,
                description: projectDetailsDraft.description,
                color: projectDetailsDraft.color,
            },
            {
                preserveScroll: true,
                onStart: () => setIsSavingDetails(true),
                onFinish: () => setIsSavingDetails(false),
                onSuccess: () =>
                    addAlert('Project details updated.', 'success'),
                onError: () =>
                    addAlert("Couldn't update project details.", 'error'),
            },
        );
    };

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] =
        useState<AssignableProjectMemberRole>('member');
    const [inviteRoleIds, setInviteRoleIds] = useState<number[]>([]);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isInviting, setIsInviting] = useState(false);

    const toggleInviteRoleId = (roleId: number, enabled: boolean) => {
        setInviteRoleIds((prev) =>
            enabled ? [...prev, roleId] : prev.filter((id) => id !== roleId),
        );
    };

    const submitInvite = (event: SyntheticEvent) => {
        event.preventDefault();
        if (!selectedProject) {
            return;
        }

        router.post(
            `/projects/${selectedProject.id}/invitations`,
            { email: inviteEmail, role: inviteRole, roles: inviteRoleIds },
            {
                preserveScroll: true,
                onStart: () => setIsInviting(true),
                onFinish: () => setIsInviting(false),
                onSuccess: () => {
                    setInviteEmail('');
                    setInviteRoleIds([]);
                    setInviteError(null);
                },
                onError: (errors) => {
                    setInviteError(errors.email ?? null);
                    if (errors.email) {
                        addAlert(errors.email, 'error');
                    }
                },
            },
        );
    };

    const [invitationToken, setInvitationToken] = useState('');
    const [tokenError, setTokenError] = useState<string | null>(null);
    const [isJoining, setIsJoining] = useState(false);

    const submitManualAccept = (event: SyntheticEvent) => {
        event.preventDefault();

        router.post(
            '/invitations/accept',
            { token: invitationToken },
            {
                preserveScroll: true,
                onStart: () => setIsJoining(true),
                onFinish: () => setIsJoining(false),
                onSuccess: () => {
                    setInvitationToken('');
                    setTokenError(null);
                },
                onError: (errors) => {
                    setTokenError(errors.token ?? null);
                    if (errors.token) {
                        addAlert(errors.token, 'error');
                    }
                },
            },
        );
    };

    const changeMemberRole = (
        memberId: number,
        role: AssignableProjectMemberRole,
    ) => {
        if (!selectedProject) {
            return;
        }

        router.patch(
            `/projects/${selectedProject.id}/members/${memberId}`,
            { role },
            {
                preserveScroll: true,
                onError: (errors) => {
                    if (errors.role) {
                        addAlert(errors.role, 'error');
                    }
                },
            },
        );
    };

    const toggleMemberCustomRole = (
        member: ProjectMember,
        roleId: number,
        enabled: boolean,
    ) => {
        if (!selectedProject) {
            return;
        }

        const nextRoleIds = enabled
            ? [...member.roleIds, roleId]
            : member.roleIds.filter((id) => id !== roleId);

        router.patch(
            `/projects/${selectedProject.id}/members/${member.id}/roles`,
            { roles: nextRoleIds },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => {
                    addAlert(
                        `Couldn't update ${member.name}'s roles.`,
                        'error',
                    );
                },
            },
        );
    };

    const removeMember = (memberId: number) => {
        if (!selectedProject) {
            return;
        }

        router.delete(`/projects/${selectedProject.id}/members/${memberId}`, {
            preserveScroll: true,
            onError: (errors) => {
                if (errors.member) {
                    addAlert(errors.member, 'error');
                }
            },
        });
    };

    const revokeInvitation = (invitationId: number) => {
        if (!selectedProject) {
            return;
        }

        router.delete(
            `/projects/${selectedProject.id}/invitations/${invitationId}`,
            { preserveScroll: true },
        );
    };

    return {
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
    };
}
