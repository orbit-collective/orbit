import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { PendingProjectInvitation } from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import { ROLE_LABELS } from '@/utils/projectMemberRoles';
import { formatDate } from '@/utils/time';

interface PendingInvitationsPanelProps {
    invitations: PendingProjectInvitation[];
    assignableRoles: WorkspaceRole[];
    onRevoke: (invitationId: number) => void;
}

export default function PendingInvitationsPanel({
    invitations,
    assignableRoles,
    onRevoke,
}: PendingInvitationsPanelProps) {
    return (
        <SettingsPanel
            title="Pending invitations"
            description="Invitations that haven't been accepted yet."
            icon="Clock"
        >
            {invitations.length === 0 ? (
                <SettingsPanelRow
                    title="No pending invitations"
                    description="Everyone you've invited has already joined, or you haven't invited anyone yet."
                />
            ) : (
                invitations.map((invitation) => (
                    <div
                        key={invitation.id}
                        className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5 md:flex-row md:items-center md:justify-between"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="bg-[var(--warning-color)]/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--warning-color)]">
                                <Icon name="Mail" size={14} />
                            </span>
                            <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                    {invitation.email}
                                </p>
                                <p className="text-sm text-[var(--text-gray-color)]">
                                    Invited by{' '}
                                    {invitation.invitedByName ?? 'someone'} as{' '}
                                    {ROLE_LABELS[invitation.role]} · expires{' '}
                                    {formatDate(invitation.expiresAt)}
                                </p>
                                {invitation.roleIds.length > 0 && (
                                    <p className="text-xs text-[var(--text-gray-color)]">
                                        + custom roles:{' '}
                                        {invitation.roleIds
                                            .map(
                                                (roleId) =>
                                                    assignableRoles.find(
                                                        (role) =>
                                                            role.id === roleId,
                                                    )?.name ?? 'Unknown role',
                                            )
                                            .join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            type="button"
                            isBox
                            className="h-9 shrink-0 px-3"
                            onClick={() => onRevoke(invitation.id)}
                        >
                            Revoke
                        </Button>
                    </div>
                ))
            )}
        </SettingsPanel>
    );
}
