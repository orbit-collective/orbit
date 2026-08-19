import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Badge from '@/Components/Atoms/Badge/Badge';
import Button from '@/Components/Atoms/Button/Button';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { PageProps } from '@/types';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectMember,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import { formatDate } from '@/utils/time';
import { router, usePage } from '@inertiajs/react';
import {
    SyntheticEvent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';

const ROLE_LABELS: Record<ProjectMemberRole, string> = {
    admin: 'Admin',
    member: 'Member',
};

const ROLE_ICONS: Record<ProjectMemberRole, 'ShieldCheck' | 'User'> = {
    admin: 'ShieldCheck',
    member: 'User',
};

function RoleBadge({ role }: { role: ProjectMemberRole }) {
    return (
        <Badge
            className={cn(
                'gap-1',
                role === 'admin' &&
                    'bg-[var(--accent-color-opacity)] text-[var(--accent-color)]',
            )}
        >
            <Icon name={ROLE_ICONS[role]} size={11} />
            {ROLE_LABELS[role]}
        </Badge>
    );
}

function TeamAvatarStack({ members }: { members: ProjectMember[] }) {
    const visible = members.slice(0, 8);
    const overflow = members.length - visible.length;

    return (
        <div className="flex items-center gap-4 px-4 py-4 sm:px-5">
            <div className="flex -space-x-2">
                {visible.map((member) => (
                    <div
                        key={member.id}
                        className="rounded-full ring-2 ring-[var(--surface-color)]"
                    >
                        <Avatar
                            src={member.avatar ?? undefined}
                            initials={member.name.charAt(0)}
                            size="lg"
                        />
                    </div>
                ))}
                {overflow > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-xs font-medium text-[var(--text-color)] ring-2 ring-[var(--surface-color)]">
                        +{overflow}
                    </div>
                )}
            </div>
            <p className="text-sm text-[var(--text-gray-color)]">
                {members.length}{' '}
                {members.length === 1 ? 'person has' : 'people have'} access to
                this project.
            </p>
        </div>
    );
}

interface PortalDropdownProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    trigger: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Renders its menu into a portal at document.body instead of positioning it
 * relative to the trigger. SettingsPanel clips overflow to keep its rounded
 * corners, which would otherwise cut off an absolutely-positioned dropdown.
 */
function PortalDropdown({
    isOpen,
    onOpenChange,
    trigger,
    children,
}: PortalDropdownProps) {
    const triggerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        width: number;
    } | null>(null);

    const updateCoords = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 8,
                left: rect.left,
                width: rect.width,
            });
        }
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        updateCoords();

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                menuRef.current?.contains(target)
            ) {
                return;
            }
            onOpenChange(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen, onOpenChange, updateCoords]);

    return (
        <div ref={triggerRef}>
            {trigger}
            {isOpen &&
                coords &&
                createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            position: 'fixed',
                            top: coords.top,
                            left: coords.left,
                            minWidth: coords.width,
                            zIndex: 9999,
                        }}
                        className={cn(
                            'flex max-h-[320px] flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border-color-strong)] bg-[var(--bg-dark-color)] p-1.5 shadow-2xl backdrop-blur-md scrollbar-none',
                        )}
                    >
                        <div className="space-y-0.5">{children}</div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}

interface RoleDropdownProps {
    value: ProjectMemberRole;
    onChange: (role: ProjectMemberRole) => void;
    disabled?: boolean;
}

function RoleDropdown({ value, onChange, disabled }: RoleDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <PortalDropdown
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            trigger={
                <DropdownTrigger
                    className="w-32"
                    disabled={disabled}
                    label={ROLE_LABELS[value]}
                    onClick={() => setIsOpen(!isOpen)}
                />
            }
        >
            {(Object.keys(ROLE_LABELS) as ProjectMemberRole[]).map((role) => (
                <DropdownItem
                    key={role}
                    label={ROLE_LABELS[role]}
                    isActive={value === role}
                    onClick={() => {
                        onChange(role);
                        setIsOpen(false);
                    }}
                />
            ))}
        </PortalDropdown>
    );
}

interface WorkspaceSettingsMembersTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    viewerRole?: ProjectMemberRole | null;
    members?: ProjectMember[];
    pendingInvitations?: PendingProjectInvitation[];
}

export default function WorkspaceSettingsMembersTab({
    memberProjects = [],
    selectedProjectId = null,
    viewerRole = null,
    members = [],
    pendingInvitations = [],
}: WorkspaceSettingsMembersTabProps) {
    const { props } = usePage<PageProps>();
    const emailEnabled = props.emailEnabled;
    const { addAlert } = useAlert();
    const isAdmin = viewerRole === 'admin';

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

    const adminCount = members.filter(
        (member) => member.role === 'admin',
    ).length;

    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<ProjectMemberRole>('member');
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [isInviting, setIsInviting] = useState(false);

    const submitInvite = (event: SyntheticEvent) => {
        event.preventDefault();
        if (!selectedProject) {
            return;
        }

        router.post(
            `/projects/${selectedProject.id}/invitations`,
            { email: inviteEmail, role: inviteRole },
            {
                preserveScroll: true,
                onStart: () => setIsInviting(true),
                onFinish: () => setIsInviting(false),
                onSuccess: () => {
                    setInviteEmail('');
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

    const changeMemberRole = (memberId: number, role: ProjectMemberRole) => {
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
                    title="Admins"
                    value={adminCount}
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

            {memberProjects.length > 1 && (
                <SettingsPanel
                    title="Project"
                    description="Choose which project's members to manage."
                    icon="FolderKanban"
                >
                    <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                        {memberProjects.map((project) => {
                            const theme = getColorTheme(project.color);
                            const selected = project.id === selectedProject.id;

                            return (
                                <button
                                    key={project.id}
                                    type="button"
                                    onClick={() => switchProject(project.id)}
                                    className={cn(
                                        'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors',
                                        selected
                                            ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                                            : 'border-[var(--border-color)] bg-[var(--surface-color)] hover:border-[var(--border-color-strong)]',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'h-2.5 w-2.5 shrink-0 rounded-full',
                                            theme.accent,
                                        )}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-color)]">
                                        {project.name}
                                    </span>
                                    {selected && (
                                        <Icon
                                            name="Check"
                                            size={14}
                                            className="shrink-0 text-[var(--accent-color)]"
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </SettingsPanel>
            )}

            <SettingsPanel
                title="Members"
                description={`People with access to "${selectedProject.name}".`}
                icon="Users"
            >
                <TeamAvatarStack members={members} />
                {members.map((member) => (
                    <SettingsPanelRow
                        key={member.id}
                        title={member.name}
                        description={member.email}
                        action={
                            <div className="flex items-center gap-2">
                                <Avatar
                                    src={member.avatar ?? undefined}
                                    initials={member.name.charAt(0)}
                                    size="md"
                                />
                                {isAdmin ? (
                                    <RoleDropdown
                                        value={member.role}
                                        onChange={(role) =>
                                            changeMemberRole(member.id, role)
                                        }
                                    />
                                ) : (
                                    <RoleBadge role={member.role} />
                                )}
                                {isAdmin && (
                                    <button
                                        type="button"
                                        title="Remove from project"
                                        onClick={() => removeMember(member.id)}
                                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                                    >
                                        <Icon name="UserMinus" size={15} />
                                    </button>
                                )}
                            </div>
                        }
                    />
                ))}
            </SettingsPanel>

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
                ) : isAdmin ? (
                    <SettingsPanelRow
                        title="Invite a teammate"
                        description="They'll receive a one-time link to join this project."
                        action={
                            <form
                                onSubmit={submitInvite}
                                className="flex flex-col items-end gap-1.5"
                            >
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(event) =>
                                            setInviteEmail(event.target.value)
                                        }
                                        placeholder="teammate@company.com"
                                        className="w-56"
                                    />
                                    <RoleDropdown
                                        value={inviteRole}
                                        onChange={setInviteRole}
                                    />
                                    <Button
                                        type="submit"
                                        isDisabled={isInviting}
                                    >
                                        Invite
                                    </Button>
                                </div>
                                {inviteError && (
                                    <span className="text-xs text-[var(--error-color)]">
                                        {inviteError}
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

            {emailEnabled && isAdmin && (
                <SettingsPanel
                    title="Pending invitations"
                    description="Invitations that haven't been accepted yet."
                    icon="Clock"
                >
                    {pendingInvitations.length === 0 ? (
                        <SettingsPanelRow
                            title="No pending invitations"
                            description="Everyone you've invited has already joined, or you haven't invited anyone yet."
                        />
                    ) : (
                        pendingInvitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5 md:flex-row md:items-center md:justify-between"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="bg-[var(--warning-color)]/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--warning-color)]">
                                        <Icon name="Mail" size={14} />
                                    </span>
                                    <div className="min-w-0 space-y-1">
                                        <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                            {invitation.email}
                                        </p>
                                        <p className="text-sm text-[var(--text-gray-color)]">
                                            Invited by{' '}
                                            {invitation.invitedByName ??
                                                'someone'}{' '}
                                            as {ROLE_LABELS[invitation.role]} ·
                                            expires{' '}
                                            {formatDate(invitation.expiresAt)}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    isBox
                                    className="shrink-0 px-3 py-1.5"
                                    onClick={() =>
                                        revokeInvitation(invitation.id)
                                    }
                                >
                                    Revoke
                                </Button>
                            </div>
                        ))
                    )}
                </SettingsPanel>
            )}

            <SettingsPanel
                title="Join with an invite code"
                description="Already have an invitation? Paste its code to join instantly."
                icon="Link"
            >
                <SettingsPanelRow
                    title="Invitation code"
                    description="If the link in your email doesn't work, paste the code here."
                    action={
                        <form
                            onSubmit={submitManualAccept}
                            className="flex flex-col items-end gap-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <Input
                                    value={invitationToken}
                                    onChange={(event) =>
                                        setInvitationToken(event.target.value)
                                    }
                                    placeholder="Invitation code"
                                    className="w-56"
                                />
                                <Button type="submit" isDisabled={isJoining}>
                                    Join
                                </Button>
                            </div>
                            {tokenError && (
                                <span className="text-xs text-[var(--error-color)]">
                                    {tokenError}
                                </span>
                            )}
                        </form>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
