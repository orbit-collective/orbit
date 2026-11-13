import { router, usePage } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo, useRef } from 'react';
import { useShortcuts } from '@/context/ShortcutContext';
import { useTheme } from '@/context/ThemeContext';
import { useCommands } from '@/hooks/useCommands';
import { useLanguage } from '@/hooks/useLanguage';
import { PageProps } from '@/types';
import { Command } from '@/types/Commands';
import { SETTINGS_TABS } from '@/types/Settings';
import { ThemeMode } from '@/types/Theme';
import { DOCS_URL, LEARN_URL, openExternal } from '@/utils/externalLinks';
import { requestOpenNotifications } from '@/utils/notificationsPopupEvent';

const THEMES: { mode: ThemeMode; title: string; icon: Command['icon'] }[] = [
    { mode: 'dark', title: 'hook_global_commands.theme.dark', icon: 'Moon' },
    { mode: 'light', title: 'hook_global_commands.theme.light', icon: 'Sun' },
    {
        mode: 'system',
        title: 'hook_global_commands.theme.system',
        icon: 'Monitor',
    },
];

/**
 * Commands that exist on every authenticated page: navigation, preferences,
 * account and help. Page-specific ones (projects, views, issue actions) are
 * registered by the component that owns the data they need.
 */
export const useGlobalCommands = (): void => {
    const { t } = useLaravelReactI18n();
    const { theme, setTheme } = useTheme();
    const { locale, locales, setLanguage } = useLanguage();
    // Read through a ref: the setter's identity must not re-register every
    // command when the i18n provider re-renders.
    const setLanguageRef = useRef(setLanguage);
    setLanguageRef.current = setLanguage;
    const { openHelp } = useShortcuts();
    const { props } = usePage<PageProps>();
    const isAuthenticated = Boolean(props.auth?.user);
    const hasUnreadNotifications = (props.notificationUnreadCount ?? 0) > 0;

    const commands = useMemo((): Command[] => {
        if (!isAuthenticated) return [];

        return [
            {
                id: 'nav.dashboard',
                title: t('hook_global_commands.nav_dashboard.title'),
                group: 'navigation',
                icon: 'LayoutDashboard',
                shortcut: ['g d', 'alt+b'],
                category: 'Navigation',
                keywords: [t('hook_global_commands.keywords.home')],
                perform: () => router.visit('/'),
            },
            {
                id: 'nav.projects',
                title: t('hook_global_commands.nav_projects.title'),
                group: 'navigation',
                icon: 'LayoutList',
                shortcut: ['g p', 'alt+p'],
                category: 'Navigation',
                perform: () => router.visit('/projects'),
            },
            {
                id: 'nav.notifications',
                title: t('hook_global_commands.nav_notifications.title'),
                group: 'navigation',
                icon: 'Bell',
                shortcut: 'g n',
                category: 'Navigation',
                keywords: [t('hook_global_commands.keywords.inbox')],
                perform: requestOpenNotifications,
            },
            {
                id: 'nav.settings',
                title: t('hook_global_commands.nav_settings.title'),
                group: 'navigation',
                icon: 'Settings',
                shortcut: 'g s',
                category: 'Navigation',
                keywords: [
                    t('hook_global_commands.keywords.preferences'),
                    t('hook_global_commands.keywords.configuration'),
                ],
                perform: () => router.visit(route('settings')),
            },
            ...SETTINGS_TABS.filter((tab) => tab.enabled).map(
                (tab): Command => ({
                    id: `nav.settings.${tab.id}`,
                    title: `${t('commands.settings_prefix')}: ${t(tab.label)}`,
                    subtitle: t(tab.description),
                    group: 'navigation',
                    icon: tab.icon,
                    keywords: [t(tab.label), tab.section],
                    perform: () => router.visit(tab.path),
                }),
            ),
            ...THEMES.map(({ mode, title, icon }): Command => ({
                id: `theme.${mode}`,
                title: t(title),
                subtitle:
                    theme === mode
                        ? t('hook_global_commands.theme.current')
                        : undefined,
                group: 'preferences',
                icon,
                keywords: [
                    t('hook_global_commands.keywords.theme'),
                    t('hook_global_commands.keywords.appearance'),
                    t('hook_global_commands.keywords.color'),
                ],
                perform: () => setTheme(mode),
            })),
            {
                id: 'language',
                title: t('hook_global_commands.language.title'),
                subtitle: locales.find((language) => language.code === locale)
                    ?.name,
                group: 'preferences',
                icon: 'Languages',
                keywords: [
                    t('hook_global_commands.keywords.language'),
                    t('hook_global_commands.keywords.locale'),
                    t('hook_global_commands.keywords.translation'),
                ],
                children: () =>
                    locales.map((language): Command => ({
                        id: `language.${language.code}`,
                        title: language.name,
                        subtitle:
                            language.code === locale
                                ? t('hook_global_commands.language.current')
                                : undefined,
                        group: 'preferences',
                        icon: 'Languages',
                        keywords: [language.code],
                        perform: () => setLanguageRef.current(language.code),
                    })),
            },
            {
                id: 'page.refresh',
                title: t('hook_global_commands.refresh.title'),
                group: 'preferences',
                icon: 'RefreshCw',
                keywords: [t('hook_global_commands.keywords.reload')],
                perform: () => router.reload(),
            },
            {
                id: 'notifications.unread',
                title: t('hook_global_commands.unread.title'),
                group: 'navigation',
                icon: 'BellDot',
                keywords: [
                    t('hook_global_commands.keywords.inbox'),
                    t('hook_global_commands.keywords.new'),
                    t('hook_global_commands.keywords.notifications'),
                ],
                when: () => hasUnreadNotifications,
                perform: () => requestOpenNotifications({ onlyUnread: true }),
            },
            {
                id: 'notifications.select',
                title: t('hook_global_commands.select.title'),
                subtitle: t('hook_global_commands.select.subtitle'),
                group: 'account',
                icon: 'ListChecks',
                keywords: [
                    t('hook_global_commands.keywords.bulk'),
                    t('hook_global_commands.keywords.delete'),
                    t('hook_global_commands.keywords.notifications'),
                    t('hook_global_commands.keywords.inbox'),
                ],
                perform: () => requestOpenNotifications({ selecting: true }),
            },
            {
                id: 'notifications.cleanup',
                title: t('hook_global_commands.cleanup.title'),
                subtitle: t('hook_global_commands.cleanup.subtitle'),
                group: 'account',
                icon: 'CalendarClock',
                keywords: [
                    t('hook_global_commands.keywords.delete_old'),
                    t('hook_global_commands.keywords.retention'),
                    t('hook_global_commands.keywords.prune'),
                    t('hook_global_commands.keywords.notifications'),
                ],
                perform: () => router.visit('/settings/notifications'),
            },
            {
                id: 'notifications.mark-all-read',
                title: t('hook_global_commands.mark_all_read.title'),
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
                title: t('hook_global_commands.logout.title'),
                group: 'account',
                icon: 'LogOut',
                keywords: [t('hook_global_commands.keywords.sign_out')],
                perform: () => router.post(route('logout')),
            },
            {
                id: 'help.shortcuts',
                title: t('hook_global_commands.shortcuts.title'),
                group: 'help',
                icon: 'Keyboard',
                shortcut: '?',
                category: 'Action',
                perform: openHelp,
            },
            {
                id: 'help.docs',
                title: t('hook_global_commands.docs.title'),
                group: 'help',
                icon: 'CircleQuestionMark',
                keywords: [
                    t('hook_global_commands.keywords.docs'),
                    t('hook_global_commands.keywords.faq'),
                ],
                perform: () => openExternal(DOCS_URL),
            },
            {
                id: 'help.learn',
                title: t('hook_global_commands.learn.title'),
                group: 'help',
                icon: 'BookOpen',
                keywords: [
                    t('hook_global_commands.keywords.tutorial'),
                    t('hook_global_commands.keywords.guide'),
                ],
                perform: () => openExternal(LEARN_URL),
            },
        ];
    }, [
        isAuthenticated,
        hasUnreadNotifications,
        theme,
        setTheme,
        locale,
        locales,
        openHelp,
        t,
    ]);

    useCommands(commands);
};
