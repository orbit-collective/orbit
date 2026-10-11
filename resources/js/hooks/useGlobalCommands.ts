import { router, usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import { useShortcuts } from '@/context/ShortcutContext';
import { useTheme } from '@/context/ThemeContext';
import { useCommands } from '@/hooks/useCommands';
import { PageProps } from '@/types';
import { Command } from '@/types/Commands';
import { SETTINGS_TABS } from '@/types/Settings';
import { ThemeMode } from '@/types/Theme';
import { DOCS_URL, LEARN_URL, openExternal } from '@/utils/externalLinks';
import { requestOpenNotifications } from '@/utils/notificationsPopupEvent';

const THEMES: { mode: ThemeMode; title: string; icon: Command['icon'] }[] = [
    { mode: 'dark', title: 'Switch to dark theme', icon: 'Moon' },
    { mode: 'light', title: 'Switch to light theme', icon: 'Sun' },
    { mode: 'system', title: 'Use system theme', icon: 'Monitor' },
];

/**
 * Commands that exist on every authenticated page: navigation, preferences,
 * account and help. Page-specific ones (projects, views, issue actions) are
 * registered by the component that owns the data they need.
 */
export const useGlobalCommands = (): void => {
    const { theme, setTheme } = useTheme();
    const { openHelp } = useShortcuts();
    const { props } = usePage<PageProps>();
    const isAuthenticated = Boolean(props.auth?.user);
    const hasUnreadNotifications = Boolean(
        props.notifications?.some((notification) => !notification.read),
    );

    const commands = useMemo((): Command[] => {
        if (!isAuthenticated) return [];

        return [
            {
                id: 'nav.dashboard',
                title: 'Go to Dashboard',
                group: 'navigation',
                icon: 'LayoutDashboard',
                shortcut: ['g d', 'alt+b'],
                category: 'Navigation',
                keywords: ['home'],
                perform: () => router.visit('/'),
            },
            {
                id: 'nav.projects',
                title: 'Go to Projects',
                group: 'navigation',
                icon: 'LayoutList',
                shortcut: ['g p', 'alt+p'],
                category: 'Navigation',
                perform: () => router.visit('/projects'),
            },
            {
                id: 'nav.notifications',
                title: 'Go to Notifications',
                group: 'navigation',
                icon: 'Bell',
                shortcut: 'g n',
                category: 'Navigation',
                keywords: ['inbox'],
                perform: requestOpenNotifications,
            },
            {
                id: 'nav.settings',
                title: 'Open Settings',
                group: 'navigation',
                icon: 'Settings',
                shortcut: 'g s',
                category: 'Navigation',
                keywords: ['preferences', 'configuration'],
                perform: () => router.visit(route('settings')),
            },
            ...SETTINGS_TABS.filter((tab) => tab.enabled).map(
                (tab): Command => ({
                    id: `nav.settings.${tab.id}`,
                    title: `Settings: ${tab.label}`,
                    subtitle: tab.description,
                    group: 'navigation',
                    icon: tab.icon,
                    keywords: [tab.label, tab.section],
                    perform: () => router.visit(tab.path),
                }),
            ),
            ...THEMES.map(({ mode, title, icon }): Command => ({
                id: `theme.${mode}`,
                title,
                subtitle: theme === mode ? 'Current' : undefined,
                group: 'preferences',
                icon,
                keywords: ['theme', 'appearance', 'color'],
                perform: () => setTheme(mode),
            })),
            {
                id: 'page.refresh',
                title: 'Refresh page',
                group: 'preferences',
                icon: 'RefreshCw',
                keywords: ['reload'],
                perform: () => router.reload(),
            },
            {
                id: 'notifications.mark-all-read',
                title: 'Mark all notifications as read',
                group: 'account',
                icon: 'CheckCheck',
                when: () => hasUnreadNotifications,
                perform: () =>
                    router.post(
                        '/notifications/mark-all-read',
                        {},
                        { preserveScroll: true },
                    ),
            },
            {
                id: 'account.logout',
                title: 'Log out',
                group: 'account',
                icon: 'LogOut',
                keywords: ['sign out'],
                perform: () => router.post(route('logout')),
            },
            {
                id: 'help.shortcuts',
                title: 'Show keyboard shortcuts',
                group: 'help',
                icon: 'Keyboard',
                shortcut: '?',
                category: 'Action',
                perform: openHelp,
            },
            {
                id: 'help.docs',
                title: 'Open documentation',
                group: 'help',
                icon: 'CircleQuestionMark',
                keywords: ['docs', 'faq'],
                perform: () => openExternal(DOCS_URL),
            },
            {
                id: 'help.learn',
                title: 'Learn Orbit',
                group: 'help',
                icon: 'BookOpen',
                keywords: ['tutorial', 'guide'],
                perform: () => openExternal(LEARN_URL),
            },
        ];
    }, [isAuthenticated, hasUnreadNotifications, theme, setTheme, openHelp]);

    useCommands(commands);
};
