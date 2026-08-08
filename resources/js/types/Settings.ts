import { icons } from 'lucide-react';

export type SettingsSectionId = 'account' | 'workspace';

export type SettingsTabId =
    | 'preferences'
    | 'profile'
    | 'notifications'
    | 'security-access'
    | 'integrations'
    | 'export'
    | 'labels'
    | 'statuses'
    | 'priorities'
    | 'templates'
    | 'documents'
    | 'members'
    | 'roles-management';

export interface SettingsTab {
    id: SettingsTabId;
    label: string;
    icon: keyof typeof icons;
    section: SettingsSectionId;
    description: string;
    /**
     * Sections still under construction are kept in the nav but not
     * navigable. Flip to `true` once a section's content is ready to ship.
     */
    enabled: boolean;
}

export const SETTINGS_TABS: SettingsTab[] = [
    {
        id: 'preferences',
        label: 'Preferences',
        icon: 'SlidersHorizontal',
        section: 'account',
        description:
            'Control personal experience defaults and display behavior.',
        enabled: true,
    },
    {
        id: 'profile',
        label: 'Profile',
        icon: 'User',
        section: 'account',
        description: 'Manage your personal details and profile visibility.',
        enabled: true,
    },
    {
        id: 'notifications',
        label: 'Notifications',
        icon: 'Bell',
        section: 'account',
        description:
            'Adjust delivery channels and activity notification rules.',
        enabled: false,
    },
    {
        id: 'security-access',
        label: 'Security & access',
        icon: 'ShieldCheck',
        section: 'account',
        description: 'Review authentication, sessions, and access controls.',
        enabled: true,
    },
    {
        id: 'integrations',
        label: 'Integrations',
        icon: 'Plug',
        section: 'account',
        description: 'Connect third-party tools and external workflows.',
        enabled: false,
    },
    {
        id: 'export',
        label: 'Export',
        icon: 'Download',
        section: 'account',
        description: 'Prepare and download your account-related data exports.',
        enabled: false,
    },
    {
        id: 'labels',
        label: 'Labels',
        icon: 'Tag',
        section: 'workspace',
        description: 'Define label taxonomy used across issues and projects.',
        enabled: false,
    },
    {
        id: 'statuses',
        label: 'Statuses',
        icon: 'ListTodo',
        section: 'workspace',
        description: 'Configure lifecycle statuses for work tracking.',
        enabled: false,
    },
    {
        id: 'priorities',
        label: 'Priorities',
        icon: 'Flag',
        section: 'workspace',
        description: 'Standardize priority levels and urgency definitions.',
        enabled: false,
    },
    {
        id: 'templates',
        label: 'Templates',
        icon: 'FileText',
        section: 'workspace',
        description: 'Create reusable templates for consistent issue creation.',
        enabled: false,
    },
    {
        id: 'documents',
        label: 'Documents',
        icon: 'File',
        section: 'workspace',
        description: 'Manage workspace documentation structure and defaults.',
        enabled: false,
    },
    {
        id: 'members',
        label: 'Members',
        icon: 'Users',
        section: 'workspace',
        description: 'View and manage team members in your workspace.',
        enabled: false,
    },
    {
        id: 'roles-management',
        label: 'Roles & management',
        icon: 'Shield',
        section: 'workspace',
        description: 'Define roles, permissions, and administrative policies.',
        enabled: false,
    },
];

export const SETTINGS_DEFAULT_TAB: SettingsTabId = 'preferences';

export const isSettingsTabId = (value: string): value is SettingsTabId => {
    return SETTINGS_TABS.some((tab) => tab.id === value);
};

export const isEnabledSettingsTabId = (value: SettingsTabId): boolean => {
    return SETTINGS_TABS.find((tab) => tab.id === value)?.enabled ?? false;
};

export const ACCOUNT_SETTINGS_TAB_IDS = [
    'preferences',
    'profile',
    'notifications',
    'security-access',
    'integrations',
    'export',
] as const;

export type AccountSettingsTabId = (typeof ACCOUNT_SETTINGS_TAB_IDS)[number];

export const isAccountSettingsTabId = (
    value: SettingsTabId,
): value is AccountSettingsTabId => {
    return ACCOUNT_SETTINGS_TAB_IDS.includes(value as AccountSettingsTabId);
};

export const WORKSPACE_SETTINGS_TAB_IDS = [
    'labels',
    'statuses',
    'priorities',
    'templates',
    'documents',
    'members',
    'roles-management',
] as const;

export type WorkspaceSettingsTabId =
    (typeof WORKSPACE_SETTINGS_TAB_IDS)[number];

export const isWorkspaceSettingsTabId = (
    value: SettingsTabId,
): value is WorkspaceSettingsTabId => {
    return WORKSPACE_SETTINGS_TAB_IDS.includes(value as WorkspaceSettingsTabId);
};
