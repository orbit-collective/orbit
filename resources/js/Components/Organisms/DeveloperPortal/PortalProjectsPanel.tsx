import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import Input from '@/Components/Atoms/Input/Input';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { CollapseProps } from '@/hooks/useCollapsedSections';
import { Paginated, PortalProject } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { rowDelay, rowIn } from '@/utils/motion';
import { linksForCurrentQuery } from '@/utils/portalLinks';
import { usePortalSearch } from './usePortalSearch';

interface PortalProjectsPanelProps {
    projects: Paginated<PortalProject>;
    queryParams: Record<string, string>;
    collapse?: CollapseProps;
}

/** `label` is a translation key. */
const CATEGORIES = [
    { key: 'todo', label: 'developer_portal.projects.categories.todo' },
    {
        key: 'in_progress',
        label: 'developer_portal.projects.categories.in_progress',
    },
    { key: 'done', label: 'developer_portal.projects.categories.done' },
] as const;

export default function PortalProjectsPanel({
    projects,
    queryParams,
    collapse,
}: PortalProjectsPanelProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const [search, setSearch] = usePortalSearch(
        'projects_search',
        'projects_page',
        'portalProjects',
        queryParams,
    );

    return (
        <SettingsPanel
            title={t('developer_portal.projects.title')}
            icon="FolderGit2"
            {...collapse?.(
                'projects',
                t('developer_portal.projects.count', { count: projects.total }),
            )}
            description={t('developer_portal.projects.description', {
                count: projects.total,
            })}
        >
            <div className="space-y-2 px-4 py-3 sm:px-5">
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t(
                        'developer_portal.projects.search_placeholder',
                    )}
                />
                <ul
                    aria-label={t('developer_portal.projects.legend')}
                    className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-(--text-muted-color) md:flex"
                >
                    {CATEGORIES.map(({ key, label }) => (
                        <li key={key} className="flex items-center gap-1.5">
                            <StatusDot status={key} size="xs" />
                            {t(label)}
                        </li>
                    ))}
                </ul>
            </div>
            {projects.data.length === 0 ? (
                <p className="px-5 py-6 text-sm text-(--text-gray-color)">
                    {t('developer_portal.projects.empty')}
                </p>
            ) : (
                projects.data.map((project, index) => (
                    <motion.div
                        key={project.id}
                        variants={rowIn}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: rowDelay(index) }}
                        className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-(--bg-light-color) sm:px-5 md:flex-row md:items-center md:gap-3"
                    >
                        <div className="flex min-w-0 items-center gap-3 md:flex-1">
                            <StatusDot
                                color={
                                    project.color ?? 'var(--text-muted-color)'
                                }
                                size="md"
                                className="shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <Link
                                    href={`/projects/${project.id}`}
                                    className={cn(
                                        'block truncate rounded-sm text-sm font-medium text-(--text-color) no-underline transition-colors duration-200 hover:text-(--accent-color)',
                                        FOCUS_RING,
                                    )}
                                >
                                    {project.name}
                                </Link>
                                <p className="truncate text-xs text-(--text-gray-color)">
                                    {project.slug} ·{' '}
                                    {tChoice(
                                        'developer_portal.projects.members',
                                        project.membersCount,
                                    )}
                                </p>
                            </div>
                        </div>
                        {/* Narrow: its own line under the name, with the words. Wide: compact, on the right. */}
                        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-5.5 text-xs text-(--text-gray-color) tabular-nums md:shrink-0 md:flex-nowrap md:gap-x-2.5 md:pl-0">
                            {CATEGORIES.map(({ key, label }) => (
                                <li
                                    key={key}
                                    title={`${project.issues[key]} ${t(label)}`}
                                    aria-label={`${project.issues[key]} ${t(label)}`}
                                    className="flex items-center gap-1"
                                >
                                    <StatusDot status={key} size="xs" />
                                    {project.issues[key]}
                                    <span className="md:hidden">
                                        {t(label)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))
            )}
            <Pagination
                links={linksForCurrentQuery(
                    projects.links,
                    'projects_page',
                    queryParams,
                )}
                from={projects.from ?? 0}
                to={projects.to ?? 0}
                total={projects.total}
                queryParams={queryParams}
                pageParam="projects_page"
                perPageParam="projects_perPage"
                preserveState
                only={['portalProjects']}
            />
        </SettingsPanel>
    );
}
