import logo from '@assets/1820.webp';
import { Link, router, usePage } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC, useEffect, useMemo, useState } from 'react';
import Divider from '@/Components/Atoms/Divider/Divider';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import NewProjectModal from '@/Components/Organisms/NewProjectModal/NewProjectModal';
import { useCommands } from '@/hooks/useCommands';
import { useLanguage } from '@/hooks/useLanguage';
import { PageProps } from '@/types';
import { Command } from '@/types/Commands';
import { DropdownOptionItem } from '@/types/Dropdown';
import { Project } from '@/types/Projects';
import { getSettingsTabByPath, SETTINGS_TABS } from '@/types/Settings';
import { cn } from '@/utils/cn';
import { getColorTheme } from '@/utils/colors';
import { DOCS_URL, LEARN_URL, openExternal } from '@/utils/externalLinks';
import { isSupportedLocale } from '@/utils/locale';
import { isTourSidebarOpen, TOUR_SIDEBAR_EVENT } from '@/utils/tourSidebar';
import Icon from '../../Atoms/Icon/Icon';
import NavItem from '../../Molecules/NavItem/NavItem';
import UserBadge from '../../Molecules/UserBadge/UserBadge';

const USER_MENU_URLS: Record<string, string> = {
    learn: LEARN_URL,
    docs: DOCS_URL,
};

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'sidebar-collapsed';

const LOCALE_OPTION_PREFIX = 'locale:';

const SETTINGS_NAV_SECTIONS = [
    { title: 'sidebar.sections.account', section: 'account' as const },
    { title: 'sidebar.sections.workspace', section: 'workspace' as const },
    { title: 'sidebar.sections.developer', section: 'developer' as const },
];

const Sidebar: FC<{ projects: Project[] }> = ({ projects }) => {
    const { t } = useLaravelReactI18n();
    const { locale, locales, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(isTourSidebarOpen);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(
        () =>
            typeof window !== 'undefined' &&
            localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true',
    );
    const {
        url,
        props: { auth, developerPortalEnabled },
    } = usePage<PageProps>();

    const isSettingsPage = url.startsWith('/settings');
    const activeSettingsTab = useMemo(() => getSettingsTabByPath(url), [url]);
    // The Developer section exists only where the portal is enabled
    // (APP_ENV=local) and the user holds `developer.portal.view`.
    const visibleSettingsTabs = useMemo(
        () =>
            SETTINGS_TABS.filter(
                (tab) =>
                    tab.section !== 'developer' ||
                    developerPortalEnabled === true,
            ),
        [developerPortalEnabled],
    );

    useEffect(() => {
        if (typeof window === 'undefined') return;

        localStorage.setItem(
            SIDEBAR_COLLAPSED_STORAGE_KEY,
            String(isCollapsed),
        );
    }, [isCollapsed]);

    useEffect(() => {
        const syncWithTour = () => setIsOpen(isTourSidebarOpen());

        window.addEventListener(TOUR_SIDEBAR_EVENT, syncWithTour);
        return () =>
            window.removeEventListener(TOUR_SIDEBAR_EVENT, syncWithTour);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    const userMenuOptions = useMemo(
        (): DropdownOptionItem[] => [
            {
                value: 'learn',
                label: t('sidebar.learn'),
                icon: 'BookOpen',
            },
            {
                value: 'docs',
                label: t('sidebar.documentation'),
                icon: 'CircleQuestionMark',
            },
            {
                value: 'settings',
                label: t('sidebar.settings'),
                icon: 'Settings',
            },
            {
                value: 'languages',
                label: t('sidebar.languages'),
                icon: 'Languages',
                children: locales.map((language): DropdownOptionItem => ({
                    value: `${LOCALE_OPTION_PREFIX}${language.code}`,
                    label: language.name,
                    trailing: language.code.toUpperCase(),
                    role: 'menuitemradio',
                    indicator: 'check',
                })),
            },
            { value: 'logout-separator', label: '', kind: 'separator' },
            {
                value: 'logout',
                label: t('sidebar.log_out'),
                icon: 'LogOut',
                tone: 'danger',
            },
        ],
        [t, locales],
    );

    const handleUserMenuSelect = (action: string) => {
        if (action.startsWith(LOCALE_OPTION_PREFIX)) {
            const next = action.slice(LOCALE_OPTION_PREFIX.length);

            if (isSupportedLocale(next)) setLanguage(next);
        } else if (action === 'logout') {
            router.post(route('logout'));
        } else if (action === 'settings') {
            router.visit(route('settings'));
        } else {
            openExternal(USER_MENU_URLS[action]);
        }
    };

    const commands = useMemo(
        (): Command[] => [
            {
                id: 'project.create',
                title: t('sidebar.create_project'),
                group: 'creation',
                icon: 'FolderPlus',
                shortcut: 'p',
                keywords: [t('sidebar.new_project_keyword')],
                perform: () => setIsNewProjectModalOpen(true),
            },
            ...projects.map((project): Command => ({
                id: `nav.project.${project.id}`,
                title: project.name,
                subtitle: t('sidebar.project_subtitle'),
                group: 'navigation',
                icon: 'FolderGit2',
                keywords: [project.slug, t('sidebar.project_keyword')],
                perform: () => router.visit(`/projects/${project.id}`),
            })),
        ],
        [projects, t],
    );

    useCommands(commands);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                aria-label={t('sidebar.open')}
                aria-expanded={isOpen}
                className="fixed top-4 left-4 z-40 rounded-md border border-solid border-(--bg-light-color) bg-(--bg-dark-color) p-2 text-(--text-gray-color) hover:text-(--text-color) md:hidden"
            >
                <Icon name="Menu" size={20} />
            </button>
            {isOpen && (
                <div
                    aria-hidden="true"
                    className="fixed inset-0 z-40 bg-(--overlay-color) backdrop-blur-xs md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col justify-between bg-(--bg-color) p-3 pr-1 transition-all duration-300 ease-in-out motion-reduce:transition-none md:relative md:translate-x-0',
                    isCollapsed ? 'w-[72px]' : 'w-[240px]',
                    isOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex min-h-0 flex-1 flex-col">
                    <div
                        className={cn(
                            'mb-3 flex items-center gap-2',
                            isCollapsed ? 'flex-col' : 'justify-between',
                        )}
                    >
                        <Link
                            href="/"
                            className={cn(
                                'flex min-w-0 items-center gap-2 overflow-hidden rounded-lg',
                                !isCollapsed && 'flex-1',
                            )}
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                                <img
                                    src={logo}
                                    alt="Orbit"
                                    className="h-8 w-8 object-contain"
                                    width={32}
                                    height={32}
                                />
                            </div>
                            {!isCollapsed && (
                                <span className="truncate text-sm font-semibold text-(--text-color)">
                                    Orbit
                                </span>
                            )}
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsCollapsed((prev) => !prev)}
                            aria-label={
                                isCollapsed
                                    ? t('sidebar.expand')
                                    : t('sidebar.collapse')
                            }
                            title={
                                isCollapsed
                                    ? t('sidebar.expand')
                                    : t('sidebar.collapse')
                            }
                            className="hidden shrink-0 rounded-md p-2 text-(--text-gray-color) hover:bg-(--bg-light-color) hover:text-(--text-color) md:flex"
                        >
                            <Icon
                                name={
                                    isCollapsed
                                        ? 'PanelLeftOpen'
                                        : 'PanelLeftClose'
                                }
                                size={16}
                            />
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label={t('sidebar.close')}
                            className="rounded-md p-2 text-(--text-gray-color) hover:bg-(--bg-light-color) hover:text-(--text-color) md:hidden"
                        >
                            <Icon name="X" size={18} />
                        </button>
                    </div>

                    <Divider className="mb-3" />

                    <nav
                        aria-label={t('sidebar.main_nav')}
                        className={'flex shrink-0 flex-col'}
                    >
                        <NavItem
                            icon="LayoutDashboard"
                            label={t('sidebar.dashboard')}
                            badge="Alt B"
                            link={'/'}
                            tourId="nav-dashboard"
                            isActive={url === '/'}
                            collapsed={isCollapsed}
                        />
                        <NavItem
                            icon="LayoutList"
                            label={t('sidebar.projects')}
                            badge={'Alt P'}
                            link={'/projects'}
                            tourId="nav-projects"
                            isActive={url === '/projects'}
                            collapsed={isCollapsed}
                        />
                    </nav>

                    {isSettingsPage ? (
                        <div
                            data-tour="settings-nav"
                            className="mt-5 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto"
                        >
                            {SETTINGS_NAV_SECTIONS.filter(({ section }) =>
                                visibleSettingsTabs.some(
                                    (tab) => tab.section === section,
                                ),
                            ).map(({ title, section }) => (
                                <div key={section}>
                                    {!isCollapsed && (
                                        <h3 className="mb-1.5 px-2.5 text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                                            {t(title)}
                                        </h3>
                                    )}
                                    <nav
                                        aria-label={t(title)}
                                        className="flex flex-col"
                                    >
                                        {visibleSettingsTabs
                                            .filter(
                                                (tab) =>
                                                    tab.section === section,
                                            )
                                            .map((tab) => (
                                                <NavItem
                                                    key={tab.id}
                                                    icon={tab.icon}
                                                    label={t(tab.label)}
                                                    link={tab.path}
                                                    isActive={
                                                        tab.id ===
                                                        activeSettingsTab
                                                    }
                                                    disabled={!tab.enabled}
                                                    collapsed={isCollapsed}
                                                />
                                            ))}
                                    </nav>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={'mt-5 flex min-h-0 flex-1 flex-col'}>
                            {isCollapsed ? (
                                <button
                                    onClick={() =>
                                        setIsNewProjectModalOpen(true)
                                    }
                                    title={t('sidebar.new_project')}
                                    aria-label={t('sidebar.new_project')}
                                    data-tour="new-project"
                                    className="mb-1.5 flex shrink-0 items-center justify-center rounded-md py-1.5 text-(--text-gray-color) hover:bg-(--bg-light-color) hover:text-(--text-color)"
                                >
                                    <Icon name="Plus" size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsNewProjectModalOpen(true)
                                    }
                                    aria-label={t('sidebar.new_project')}
                                    data-tour="new-project"
                                    className={
                                        'group mb-1.5 flex shrink-0 items-center justify-between rounded-md px-2.5 py-1'
                                    }
                                >
                                    <span
                                        className={
                                            'text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase group-hover:text-(--text-color)'
                                        }
                                    >
                                        {t('sidebar.projects_heading')}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-(--text-gray-color) group-hover:text-(--text-color)">
                                        {projects.length > 0 && (
                                            <span className="text-xs font-medium">
                                                {projects.length}
                                            </span>
                                        )}
                                        <Icon name={'Plus'} size={14} />
                                    </span>
                                </button>
                            )}
                            <nav
                                aria-label={t('sidebar.projects')}
                                /* eslint-disable-next-line react/no-unknown-property */
                                scroll-region={''}
                                className={
                                    'flex min-h-0 flex-col overflow-y-auto'
                                }
                            >
                                {projects.map(
                                    (projectElement: Project, index) => {
                                        const projectLink = `/projects/${projectElement.id}`;

                                        const isActive =
                                            url === projectLink ||
                                            url.startsWith(`${projectLink}/`) ||
                                            url.startsWith(`${projectLink}?`);

                                        return (
                                            <NavItem
                                                key={projectElement.id}
                                                title={projectElement.name}
                                                iconClassName={`${
                                                    getColorTheme(
                                                        projectElement.color,
                                                    ).accent
                                                }`}
                                                label={
                                                    projectElement.name.length >
                                                    16
                                                        ? projectElement.name.substring(
                                                              0,
                                                              16,
                                                          ) + '...'
                                                        : projectElement.name
                                                }
                                                link={projectLink}
                                                tourId={
                                                    index === 0
                                                        ? 'first-project'
                                                        : undefined
                                                }
                                                isActive={isActive}
                                                preserveScroll
                                                collapsed={isCollapsed}
                                            />
                                        );
                                    },
                                )}
                            </nav>
                        </div>
                    )}
                </div>

                <div
                    className={
                        'relative shrink-0 border-t border-(--bg-light-color) pt-3'
                    }
                >
                    <Dropdown
                        variant="menu"
                        ariaLabel={t('sidebar.user_menu')}
                        placement="top"
                        width={isCollapsed ? 208 : 'trigger'}
                        triggerClassName="w-full"
                        options={userMenuOptions}
                        selectedValues={[`${LOCALE_OPTION_PREFIX}${locale}`]}
                        onSelect={handleUserMenuSelect}
                        trigger={
                            <button
                                type="button"
                                data-tour="user-menu"
                                aria-label={
                                    isCollapsed
                                        ? t('sidebar.user_menu')
                                        : undefined
                                }
                                className={cn(
                                    'flex w-full cursor-pointer items-center rounded-lg px-2 py-1.5 text-left hover:bg-(--bg-light-color)',
                                    isCollapsed
                                        ? 'justify-center'
                                        : 'justify-between',
                                )}
                            >
                                <UserBadge
                                    name={auth.user.name}
                                    email={auth.user.email}
                                    avatarSrc={auth.user.avatar ?? undefined}
                                    size="md"
                                    showDetails={!isCollapsed}
                                    showName={!isCollapsed}
                                    showTooltip={false}
                                />
                                {!isCollapsed && (
                                    <Icon
                                        name="ChevronDown"
                                        size={14}
                                        color="var(--text-gray-color)"
                                    />
                                )}
                            </button>
                        }
                    />
                </div>
            </aside>

            <NewProjectModal
                isOpen={isNewProjectModalOpen}
                onClose={() => setIsNewProjectModalOpen(false)}
            />
        </>
    );
};

export default Sidebar;
