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
    | 'issue-types'
    | 'priorities'
    | 'documents'
    | 'members'
    | 'roles-management';

export interface SettingsTab {
    id: SettingsTabId;
    /**
     * The tab's own URL. Every enabled tab is a real server-rendered page
     * with its own route (`Route::get('/settings/<id>')`, route name
     * `settings.<id>`), so the backend only ever computes the props that
     * one tab needs. Disabled tabs keep a path here for completeness but
     * have no route registered until they're flipped live.
     */
    path: string;
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
        path: '/settings/preferences',
        label: 'Preferences',
        icon: 'SlidersHorizontal',
        section: 'account',
        description:
            'Control personal experience defaults and display behavior.',
        enabled: true,
    },
    {
        id: 'profile',
        path: '/settings/profile',
        label: 'Profile',
        icon: 'User',
        section: 'account',
        description: 'Manage your personal details and profile visibility.',
        enabled: true,
    },
    {
        id: 'notifications',
        path: '/settings/notifications',
        label: 'Notifications',
        icon: 'Bell',
        section: 'account',
        description:
            'Adjust delivery channels and activity notification rules.',
        enabled: true,
    },
    {
        id: 'security-access',
        path: '/settings/security-access',
        label: 'Security & access',
        icon: 'ShieldCheck',
        section: 'account',
        description: 'Review authentication, sessions, and access controls.',
        enabled: true,
    },
    {
        id: 'export',
        path: '/settings/export',
        label: 'Export',
        icon: 'Download',
        section: 'account',
        description: 'Prepare and download your account-related data exports.',
        enabled: false,
    },
    {
        id: 'labels',
        path: '/settings/labels',
        label: 'Labels',
        icon: 'Tag',
        section: 'workspace',
        description: 'Define label taxonomy used across issues and projects.',
        enabled: true,
    },
    {
        id: 'issue-types',
        path: '/settings/issue-types',
        label: 'Issue Types',
        icon: 'Shapes',
        section: 'workspace',
        description:
            'Customize the catalog of issue types, their icons, colors and workflows.',
        enabled: true,
    },
    {
        id: 'priorities',
        path: '/settings/priorities',
        label: 'Priorities',
        icon: 'Flag',
        section: 'workspace',
        description: 'Standardize priority levels and urgency definitions.',
        enabled: false,
    },
    {
        id: 'documents',
        path: '/settings/documents',
        label: 'Documents',
        icon: 'File',
        section: 'workspace',
        description: 'Manage workspace documentation structure and defaults.',
        enabled: false,
    },
    {
        id: 'members',
        path: '/settings/members',
        label: 'Members',
        icon: 'Users',
        section: 'workspace',
        description: 'View and manage team members in your workspace.',
        enabled: true,
    },
    {
        id: 'roles-management',
        path: '/settings/roles-management',
        label: 'Roles & management',
        icon: 'Shield',
        section: 'workspace',
        description: 'Define roles, permissions, and administrative policies.',
        enabled: true,
    },
    {
        id: 'integrations',
        path: '/settings/integrations',
        label: 'Integrations',
        icon: 'Plug',
        section: 'workspace',
        description: 'Connect third-party tools and external workflows.',
        enabled: true,
    },
];

export const SETTINGS_DEFAULT_TAB: SettingsTabId = 'preferences';

export const getSettingsTab = (id: SettingsTabId): SettingsTab => {
    return (
        SETTINGS_TABS.find((tab) => tab.id === id) ??
        (SETTINGS_TABS.find(
            (tab) => tab.id === SETTINGS_DEFAULT_TAB,
        ) as SettingsTab)
    );
};

/**
 * Resolves the tab that owns a URL, ignoring any query string — each tab
 * is its own page now, so the path alone identifies it. Falls back to the
 * default tab for `/settings` itself and for anything unrecognised.
 */
export const getSettingsTabByPath = (url: string): SettingsTabId => {
    const [pathname = ''] = url.split('?');
    const normalized = pathname.replace(/\/+$/, '');

    return (
        SETTINGS_TABS.find((tab) => tab.path === normalized && tab.enabled)
            ?.id ?? SETTINGS_DEFAULT_TAB
    );
};
