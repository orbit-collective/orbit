import type { icons } from 'lucide-react';

export type SettingsSectionId = 'account' | 'workspace' | 'developer';

export type SettingsTabId =
    | 'preferences'
    | 'profile'
    | 'notifications'
    | 'security-access'
    | 'integrations'
    | 'automation'
    | 'export'
    | 'labels'
    | 'issue-types'
    | 'priorities'
    | 'documents'
    | 'members'
    | 'roles-management'
    | 'dev-portal';

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
    /** Translation key (`settings.tabs.<id>.label`); translate it with `t()`. */
    label: string;
    icon: keyof typeof icons;
    section: SettingsSectionId;
    /** Translation key (`settings.tabs.<id>.description`). */
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
        label: 'settings.tabs.preferences.label',
        icon: 'SlidersHorizontal',
        section: 'account',
        description: 'settings.tabs.preferences.description',
        enabled: true,
    },
    {
        id: 'profile',
        path: '/settings/profile',
        label: 'settings.tabs.profile.label',
        icon: 'User',
        section: 'account',
        description: 'settings.tabs.profile.description',
        enabled: true,
    },
    {
        id: 'notifications',
        path: '/settings/notifications',
        label: 'settings.tabs.notifications.label',
        icon: 'Bell',
        section: 'account',
        description: 'settings.tabs.notifications.description',
        enabled: true,
    },
    {
        id: 'security-access',
        path: '/settings/security-access',
        label: 'settings.tabs.security-access.label',
        icon: 'ShieldCheck',
        section: 'account',
        description: 'settings.tabs.security-access.description',
        enabled: true,
    },
    {
        id: 'export',
        path: '/settings/export',
        label: 'settings.tabs.export.label',
        icon: 'Download',
        section: 'account',
        description: 'settings.tabs.export.description',
        enabled: false,
    },
    {
        id: 'labels',
        path: '/settings/labels',
        label: 'settings.tabs.labels.label',
        icon: 'Tag',
        section: 'workspace',
        description: 'settings.tabs.labels.description',
        enabled: true,
    },
    {
        id: 'issue-types',
        path: '/settings/issue-types',
        label: 'settings.tabs.issue-types.label',
        icon: 'Shapes',
        section: 'workspace',
        description: 'settings.tabs.issue-types.description',
        enabled: true,
    },
    {
        id: 'priorities',
        path: '/settings/priorities',
        label: 'settings.tabs.priorities.label',
        icon: 'Flag',
        section: 'workspace',
        description: 'settings.tabs.priorities.description',
        enabled: true,
    },
    {
        id: 'documents',
        path: '/settings/documents',
        label: 'settings.tabs.documents.label',
        icon: 'File',
        section: 'workspace',
        description: 'settings.tabs.documents.description',
        enabled: false,
    },
    {
        id: 'members',
        path: '/settings/members',
        label: 'settings.tabs.members.label',
        icon: 'Users',
        section: 'workspace',
        description: 'settings.tabs.members.description',
        enabled: true,
    },
    {
        id: 'roles-management',
        path: '/settings/roles-management',
        label: 'settings.tabs.roles-management.label',
        icon: 'Shield',
        section: 'workspace',
        description: 'settings.tabs.roles-management.description',
        enabled: true,
    },
    {
        id: 'integrations',
        path: '/settings/integrations',
        label: 'settings.tabs.integrations.label',
        icon: 'Plug',
        section: 'workspace',
        description: 'settings.tabs.integrations.description',
        enabled: true,
    },
    {
        id: 'automation',
        path: '/settings/automation',
        label: 'settings.tabs.automation.label',
        icon: 'Zap',
        section: 'workspace',
        description: 'settings.tabs.automation.description',
        enabled: true,
    },
    {
        id: 'dev-portal',
        path: '/settings/dev-portal',
        label: 'settings.tabs.dev-portal.label',
        icon: 'Code',
        section: 'developer',
        description: 'settings.tabs.dev-portal.description',
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
