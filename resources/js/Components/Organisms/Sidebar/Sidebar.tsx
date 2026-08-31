import Divider from '@/Components/Atoms/Divider/Divider';
import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import NewProjectModal from '@/Components/Organisms/NewProjectModal/NewProjectModal';
import { useShortcuts } from '@/context/ShortcutContext';
import { PageProps } from '@/types';
import { Project } from '@/types/Projects';
import { ShortcutDefinition } from '@/types/Shortcuts';
import { getColorTheme } from '@/utils/colors';
import { Link, router, usePage } from '@inertiajs/react';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../Atoms/Icon/Icon';
import NavItem from '../../Molecules/NavItem/NavItem';
import UserBadge from '../../Molecules/UserBadge/UserBadge';

const Sidebar: FC<{ projects: Project[] }> = ({ projects }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const {
        url,
        props: { auth },
    } = usePage<PageProps>();

    useEffect(() => {
        if (!isUserMenuOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!userMenuRef.current?.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isUserMenuOpen]);

    const handleLogout = () => {
        router.post(route('logout'));
    };
    const handleOpenSettings = () => {
        setIsUserMenuOpen(false);
        router.visit(route('settings'));
    };
    const handleOpenUrl = (url: string) => () => {
        setIsUserMenuOpen(false);
        const w = window.open(url, '_blank', 'noopener,noreferrer');
        if (w) w.opener = null;
    };

    const shortcuts = useMemo(
        (): ShortcutDefinition[] => [
            {
                key: 'p',
                description: 'Create project',
                category: 'Creation',
                action: () => setIsNewProjectModalOpen(true),
            },
        ],
        [],
    );

    useShortcuts(shortcuts);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed left-4 top-4 z-40 rounded-md border border-solid border-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-2 text-[var(--text-gray-color)] hover:text-[var(--text-color)] md:hidden"
            >
                <Icon name="Menu" size={20} />
            </button>
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-[var(--overlay-color)] backdrop-blur-sm md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[240px] shrink-0 flex-col justify-between border-r border-solid border-r-[var(--bg-light-color)] bg-[var(--bg-dark-color)] p-3 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} `}
            >
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex flex-1 cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--bg-light-color)]">
                            <UserBadge name="Acme Inc." size="sm" />
                            <Icon
                                name="ChevronDown"
                                size={14}
                                color="var(--text-gray-color)"
                            />
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-md p-2 text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)] md:hidden"
                        >
                            <Icon name="X" size={18} />
                        </button>
                    </div>

                    <Divider className="mb-3" />

                    <nav className={'flex shrink-0 flex-col'}>
                        <NavItem
                            icon="LayoutDashboard"
                            label="Dashboard"
                            badge="Alt B"
                            link={'/'}
                            isActive={url === '/'}
                        />
                        <NavItem
                            icon="LayoutList"
                            label="Projects"
                            badge={'Alt P'}
                            link={'/projects'}
                            isActive={url === '/projects'}
                        />
                    </nav>

                    <div className={'mt-5 flex min-h-0 flex-1 flex-col'}>
                        <Link
                            onClick={(e) => {
                                e.preventDefault();
                                setIsNewProjectModalOpen(true);
                            }}
                            className={
                                'group mb-1.5 flex shrink-0 items-center justify-between rounded-md px-2.5 py-1'
                            }
                        >
                            <h3
                                className={
                                    'text-xs font-semibold uppercase tracking-wider text-[var(--text-gray-color)] group-hover:text-[var(--text-color)]'
                                }
                            >
                                PROJECTS
                            </h3>
                            <div className="flex items-center gap-1.5 text-[var(--text-gray-color)] group-hover:text-[var(--text-color)]">
                                {projects.length > 0 && (
                                    <span className="text-xs font-medium">
                                        {projects.length}
                                    </span>
                                )}
                                <Icon name={'Plus'} size={14} />
                            </div>
                        </Link>
                        <nav
                            /* eslint-disable-next-line react/no-unknown-property */
                            scroll-region={''}
                            className={'flex min-h-0 flex-col overflow-y-auto'}
                        >
                            {projects.map((projectElement: Project) => {
                                const projectLink = `/projects/${projectElement.id}`;

                                const isActive =
                                    url === projectLink ||
                                    url.startsWith(`${projectLink}/`) ||
                                    url.startsWith(`${projectLink}?`);

                                return (
                                    <NavItem
                                        key={projectElement.id}
                                        icon="FolderGit2"
                                        iconClassName={`${
                                            getColorTheme(projectElement.color)
                                                .accent
                                        } h-5 w-5 rounded-md p-1`}
                                        label={
                                            projectElement.name.length > 16
                                                ? projectElement.name.substring(
                                                      0,
                                                      16,
                                                  ) + '...'
                                                : projectElement.name
                                        }
                                        link={projectLink}
                                        isActive={isActive}
                                        preserveScroll
                                    />
                                );
                            })}
                        </nav>
                    </div>
                </div>

                <div
                    className={
                        'relative shrink-0 border-t border-solid border-[var(--bg-light-color)] pt-3'
                    }
                    ref={userMenuRef}
                >
                    <div
                        onClick={() => setIsUserMenuOpen((prev) => !prev)}
                        className={
                            'flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[var(--bg-light-color)]'
                        }
                    >
                        <UserBadge
                            name={auth.user.name}
                            email={auth.user.email}
                            avatarSrc={auth.user.avatar ?? undefined}
                            size="md"
                            showDetails
                            showTooltip={false}
                        />
                        <Icon
                            name="ChevronDown"
                            size={14}
                            color="var(--text-gray-color)"
                        />
                    </div>

                    {isUserMenuOpen && (
                        <DropdownMenu direction="top">
                            <DropdownItem
                                label={
                                    <>
                                        <Icon name="BookOpen" size={14} />
                                        Learn
                                    </>
                                }
                                onClick={handleOpenUrl(
                                    'https://orbit-dev.app/learn',
                                )}
                            />
                            <DropdownItem
                                label={
                                    <>
                                        <Icon
                                            name="CircleQuestionMark"
                                            size={14}
                                        />
                                        Documentation
                                    </>
                                }
                                onClick={handleOpenUrl(
                                    'https://docs.orbit-dev.app',
                                )}
                            />
                            <DropdownItem
                                label={
                                    <>
                                        <Icon name="Settings" size={14} />
                                        Settings
                                    </>
                                }
                                onClick={handleOpenSettings}
                            />
                            <DropdownItem
                                label={
                                    <>
                                        <Icon name="LogOut" size={14} />
                                        Log out
                                    </>
                                }
                                onClick={handleLogout}
                                variant="danger"
                            />
                        </DropdownMenu>
                    )}
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
