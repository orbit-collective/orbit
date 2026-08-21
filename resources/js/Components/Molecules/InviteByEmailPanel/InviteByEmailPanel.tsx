import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import MemberRoleDropdown from '@/Components/Molecules/MemberRoleDropdown/MemberRoleDropdown';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { AssignableProjectMemberRole } from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import { SyntheticEvent } from 'react';

interface InviteByEmailPanelProps {
    emailEnabled: boolean;
    isManager: boolean;
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
    isManager,
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
    return (
        <SettingsPanel
            title="Invite by email"
            description={
                emailEnabled
                    ? "Send a one-time invite link to a teammate's email address."
                    : "Email notifications aren't configured yet, so invitations are disabled."
            }
            icon="Mail"
        >
            {!emailEnabled ? (
                <SettingsPanelRow
                    title="Invitations unavailable"
                    description="Ask an administrator to configure outgoing email to enable project invitations."
                />
            ) : isManager ? (
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
                            placeholder="teammate@company.com"
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
                            Invite
                        </Button>
                    </div>
                    {error && (
                        <span className="text-xs text-[var(--error-color)]">
                            {error}
                        </span>
                    )}
                </form>
            ) : (
                <SettingsPanelRow
                    title="Only admins can invite"
                    description="Ask a project admin to invite new teammates."
                />
            )}
        </SettingsPanel>
    );
}
