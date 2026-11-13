import { useLaravelReactI18n } from 'laravel-react-i18n';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { PendingProjectInvitation } from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
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
    const { t } = useLaravelReactI18n();
    return (
        <SettingsPanel
            id="pending-invitations"
            collapsedSummary={t('pending_invitations_panel.pending', {
                count: invitations.length,
            })}
            title={t('pending_invitations_panel.title')}
            description={t('pending_invitations_panel.description')}
            icon="Clock"
        >
            {invitations.length === 0 ? (
                <SettingsPanelRow
                    title={t('pending_invitations_panel.empty.title')}
                    description={t(
                        'pending_invitations_panel.empty.description',
                    )}
                />
            ) : (
                invitations.map((invitation) => (
                    <div
                        key={invitation.id}
                        className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-(--bg-light-color) sm:px-5 md:flex-row md:items-center md:justify-between"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--warning-color)/10 text-(--warning-color)">
                                <Icon name="Mail" size={14} />
                            </span>
                            <div className="min-w-0 space-y-1">
                                <p className="truncate text-sm font-medium text-(--text-color)">
                                    {invitation.email}
                                </p>
                                <p className="text-sm text-(--text-gray-color)">
                                    {t('pending_invitations_panel.invited', {
                                        name:
                                            invitation.invitedByName ??
                                            t(
                                                'pending_invitations_panel.someone',
                                            ),
                                        role: t(
                                            `pending_invitations_panel.roles.${invitation.role}`,
                                        ),
                                        date: formatDate(invitation.expiresAt),
                                    })}
                                </p>
                                {invitation.roleIds.length > 0 && (
                                    <p className="text-xs text-(--text-gray-color)">
                                        {t(
                                            'pending_invitations_panel.custom_roles',
                                        )}{' '}
                                        {invitation.roleIds
                                            .map(
                                                (roleId) =>
                                                    assignableRoles.find(
                                                        (role) =>
                                                            role.id === roleId,
                                                    )?.name ??
                                                    t(
                                                        'pending_invitations_panel.unknown_role',
                                                    ),
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
                            {t('pending_invitations_panel.revoke')}
                        </Button>
                    </div>
                ))
            )}
        </SettingsPanel>
    );
}
