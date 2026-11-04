import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import Input from '@/Components/Atoms/Input/Input';
import StatusDot from '@/Components/Atoms/StatusDot/StatusDot';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { CollapseProps } from '@/hooks/useCollapsedSections';
import { Paginated, PortalProject } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { FOCUS_RING } from '@/utils/focusRing';
import { rowDelay, rowIn } from '@/utils/motion';
import { usePortalSearch } from './usePortalSearch';

interface PortalProjectsPanelProps {
    projects: Paginated<PortalProject>;
    queryParams: Record<string, string>;
    collapse?: CollapseProps;
}

const CATEGORIES = [
    { key: 'todo', label: 'to do' },
    { key: 'in_progress', label: 'in progress' },
    { key: 'done', label: 'done' },
] as const;

export default function PortalProjectsPanel({
    projects,
    queryParams,
    collapse,
}: PortalProjectsPanelProps) {
    const [search, setSearch] = usePortalSearch(
        'projects_search',
        'projects_page',
        'portalProjects',
        queryParams,
    );

    return (
        <SettingsPanel
            title="Projects"
            icon="FolderGit2"
            {...collapse?.('projects', `${projects.total} projects`)}
            description={`Every project on this instance (${projects.total}).`}
        >
            <div className="space-y-2 px-4 py-3 sm:px-5">
                <Input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name or slug"
                />
                <ul
                    aria-label="Issue counts legend"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted-color)]"
                >
                    {CATEGORIES.map(({ key, label }) => (
                        <li key={key} className="flex items-center gap-1.5">
                            <StatusDot status={key} size="xs" />
                            {label}
                        </li>
                    ))}
                </ul>
            </div>
            {projects.data.length === 0 ? (
                <p className="px-5 py-6 text-sm text-[var(--text-gray-color)]">
                    No projects match.
                </p>
            ) : (
                projects.data.map((project, index) => (
                    <motion.div
                        key={project.id}
                        variants={rowIn}
                        initial="hidden"
                        animate="show"
                        transition={{ delay: rowDelay(index) }}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                    >
                        <StatusDot
                            color={project.color ?? 'var(--text-muted-color)'}
                            size="md"
                        />
                        <div className="min-w-0 flex-1">
                            <Link
                                href={`/projects/${project.id}`}
                                className={cn(
                                    'block truncate rounded text-sm font-medium text-[var(--text-color)] no-underline transition-colors duration-200 hover:text-[var(--accent-color)]',
                                    FOCUS_RING,
                                )}
                            >
                                {project.name}
                            </Link>
                            <p className="truncate text-xs text-[var(--text-gray-color)]">
                                {project.slug} · {project.membersCount}{' '}
                                {project.membersCount === 1
                                    ? 'member'
                                    : 'members'}
                            </p>
                        </div>
                        <ul className="flex shrink-0 items-center gap-2.5 text-xs tabular-nums text-[var(--text-gray-color)]">
                            {CATEGORIES.map(({ key, label }) => (
                                <li
                                    key={key}
                                    title={`${project.issues[key]} ${label}`}
                                    aria-label={`${project.issues[key]} ${label}`}
                                    className="flex items-center gap-1"
                                >
                                    <StatusDot status={key} size="xs" />
                                    {project.issues[key]}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))
            )}
            <Pagination
                links={projects.links}
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
