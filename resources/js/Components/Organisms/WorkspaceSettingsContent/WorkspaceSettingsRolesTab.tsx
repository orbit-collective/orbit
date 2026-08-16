import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useState } from 'react';

type RoleKey = 'admin' | 'member' | 'guest';

const roles: Array<{
    id: RoleKey;
    label: string;
    accentClassName: string;
    permissions: string[];
}> = [
    {
        id: 'admin',
        label: 'Admin',
        accentClassName: 'bg-emerald-400',
        permissions: [
            'Workspace settings',
            'Member management',
            'All projects',
        ],
    },
    {
        id: 'member',
        label: 'Member',
        accentClassName: 'bg-violet-400',
        permissions: ['Issue create/edit', 'Comments', 'Project participation'],
    },
    {
        id: 'guest',
        label: 'Guest',
        accentClassName: 'bg-sky-400',
        permissions: ['Read access', 'Limited comments', 'No admin actions'],
    },
];

export default function WorkspaceSettingsRolesTab() {
    const [roleApproval, setRoleApproval] = useState(true);
    const [selectedRole, setSelectedRole] = useState<RoleKey>('admin');

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Roles and permissions"
                description="Define permission boundaries and admin responsibilities."
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1fr_1.1fr]">
                    <div className="space-y-2">
                        {roles.map((role) => (
                            <button
                                key={role.id}
                                type="button"
                                onClick={() => setSelectedRole(role.id)}
                                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                                    selectedRole === role.id
                                        ? 'border-[var(--accent-color)] bg-[var(--accent-color-opacity)]'
                                        : 'border-[var(--bg-light-color)] bg-[var(--bg-color)] hover:border-[var(--border-color-strong)]'
                                }`}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-sm font-medium text-[var(--text-color)]">
                                        {role.label}
                                    </p>
                                    <span
                                        className={`h-2 w-2 rounded-full ${role.accentClassName}`}
                                    />
                                </div>
                                <p className="text-xs text-[var(--text-gray-color)]">
                                    {role.permissions[0]}
                                </p>
                            </button>
                        ))}
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-medium text-[var(--text-color)]">
                                    Permission matrix preview
                                </p>
                                <Icon name="Shield" size={14} />
                            </div>
                            <div className="space-y-1.5">
                                {roles
                                    .filter((role) => role.id === selectedRole)
                                    .map((role) => (
                                        <div
                                            key={role.id}
                                            className="space-y-1.5"
                                        >
                                            {role.permissions.map(
                                                (permission) => (
                                                    <div
                                                        key={permission}
                                                        className="flex items-center justify-between rounded-md bg-[var(--bg-light-color)] px-2 py-1 text-xs text-[var(--text-color)]"
                                                    >
                                                        <span>
                                                            {permission}
                                                        </span>
                                                        <span
                                                            className={`h-1.5 w-8 rounded-full ${role.accentClassName}`}
                                                        />
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] p-4">
                            <p className="text-sm font-medium text-[var(--text-color)]">
                                Role change policy
                            </p>
                            <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs text-[var(--text-gray-color)]">
                                    Approval workflow
                                </span>
                                <ToggleSwitch
                                    checked={roleApproval}
                                    onChange={setRoleApproval}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <SettingsPanelRow
                    title="Role matrix"
                    description="Review and update permissions for each workspace role."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            Edit matrix
                        </Button>
                    }
                />
                <SettingsPanelRow
                    title="Custom roles"
                    description="Create additional role presets tailored to team structure."
                    action={
                        <button
                            type="button"
                            className="rounded-md border border-dashed border-[var(--bg-light-color)] px-3 py-1.5 text-xs font-semibold text-[var(--text-color)] transition-colors hover:border-[var(--border-color-strong)]"
                        >
                            + Create role
                        </button>
                    }
                />
            </SettingsPanel>
            <SettingsPanel
                title="Administration"
                description="Operational controls for workspace governance."
            >
                <SettingsPanelRow
                    title="Audit logs"
                    description="Inspect security-sensitive role and policy changes."
                    action={
                        <Button type="button" isBox className="px-3 py-1.5">
                            View logs
                        </Button>
                    }
                />
            </SettingsPanel>
        </div>
    );
}
