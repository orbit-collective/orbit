import Button from '@/Components/Atoms/Button/Button';
import Input from '@/Components/Atoms/Input/Input';
import CustomRolesDropdown from '@/Components/Molecules/CustomRolesDropdown/CustomRolesDropdown';
import RoleDropdown from '@/Components/Molecules/RoleDropdown/RoleDropdown';
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
                <SettingsPanelRow
                    title="Invite a teammate"
                    description="They'll receive a one-time link to join this project."
                    action={
                        <form
                            onSubmit={onSubmit}
                            className="flex flex-col items-end gap-1.5"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        onEmailChange(event.target.value)
                                    }
                                    placeholder="teammate@company.com"
                                    className="h-9 w-56"
                                />
                                <RoleDropdown
                                    value={role}
                                    onChange={onRoleChange}
                                />
                                {canAssignRoles && (
                                    <CustomRolesDropdown
                                        roles={assignableRoles}
                                        selectedRoleIds={roleIds}
                                        onToggle={onToggleRoleId}
                                    />
                                )}
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
                    }
                />
            ) : (
                <SettingsPanelRow
                    title="Only admins can invite"
                    description="Ask a project admin to invite new teammates."
                />
            )}
        </SettingsPanel>
    );
}
