import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import MemberRoleDropdown from '@/Components/Molecules/MemberRoleDropdown/MemberRoleDropdown';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { AssignableProjectMemberRole } from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';

interface InviteByEmailPanelProps {
    emailEnabled: boolean;
    canInvite: boolean;
    canAssignRoles: boolean;
    assignableRoles: WorkspaceRole[];
    email: string;
    role: AssignableProjectMemberRole;
    roleIds: number[];
    error: string | null;
    isInviting: boolean;
    onEmailChange: (email: string) => void;
    onRoleChange: (role: AssignableProjectMemberRole) => void;
    onToggleRoleId: (roleId: number, enabled: boolean) => void;
    onSubmit: (event: SyntheticEvent) => void;
}

export default function InviteByEmailPanel({
    emailEnabled,
    canInvite,
    canAssignRoles,
    assignableRoles,
    email,
    role,
    roleIds,
    error,
    isInviting,
    onEmailChange,
    onRoleChange,
    onToggleRoleId,
    onSubmit,
}: InviteByEmailPanelProps) {
    const { t } = useLaravelReactI18n();
    return (
        <SettingsPanel
            id="invite"
            title={t('invite_by_email_panel.title')}
            description={
                emailEnabled
                    ? t('invite_by_email_panel.description_enabled')
                    : t('invite_by_email_panel.description_disabled')
            }
            icon="Mail"
        >
            {!emailEnabled ? (
                <SettingsPanelRow
                    title={t('invite_by_email_panel.unavailable.title')}
                    description={t(
                        'invite_by_email_panel.unavailable.description',
                    )}
                />
            ) : canInvite ? (
                <form
                    onSubmit={onSubmit}
                    className="flex flex-col gap-2 px-4 py-4 sm:px-5"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <Input
                            type="email"
                            value={email}
                            onChange={(event) =>
                                onEmailChange(event.target.value)
                            }
                            placeholder={t(
                                'invite_by_email_panel.email_placeholder',
                            )}
                            className="h-9 min-w-[200px] flex-1"
                        />
                        <MemberRoleDropdown
                            role={role}
                            canChangeRole
                            onChangeRole={onRoleChange}
                            customRoles={canAssignRoles ? assignableRoles : []}
                            selectedCustomRoleIds={roleIds}
                            canAssignCustomRoles={canAssignRoles}
                            onToggleCustomRole={onToggleRoleId}
                        />
                        <Button
                            type="submit"
                            isDisabled={isInviting}
                            className="h-9"
                        >
                            {t('invite_by_email_panel.invite')}
                        </Button>
                    </div>
                    {error && (
                        <span className="text-xs text-(--error-color)">
                            {error}
                        </span>
                    )}
                </form>
            ) : (
                <SettingsPanelRow
                    title={t('invite_by_email_panel.no_permission.title')}
                    description={t(
                        'invite_by_email_panel.no_permission.description',
                    )}
                />
            )}
        </SettingsPanel>
    );
}
