import axios from 'axios';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useCallback, useMemo, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import StatusPill from '@/Components/Atoms/StatusPill/StatusPill';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import BranchesPanel from '@/Components/Organisms/BranchesPanel/BranchesPanel';
import CommitsPanel from '@/Components/Organisms/CommitsPanel/CommitsPanel';
import CreateBranchModal from '@/Components/Organisms/CreateBranchModal/CreateBranchModal';
import DevelopmentEmptyState from '@/Components/Organisms/DevelopmentEmptyState/DevelopmentEmptyState';
import DevelopmentSettingsModal from '@/Components/Organisms/DevelopmentSettingsModal/DevelopmentSettingsModal';
import DevelopmentStats from '@/Components/Organisms/DevelopmentStats/DevelopmentStats';
import PullRequestsPanel from '@/Components/Organisms/PullRequestsPanel/PullRequestsPanel';
import RepositoryInsights from '@/Components/Organisms/RepositoryInsights/RepositoryInsights';
import { useCiSummaries } from '@/hooks/useCiSummaries';
import { useDevelopmentActions } from '@/hooks/useDevelopmentActions';
import { useDevelopmentResource } from '@/hooks/useDevelopmentResource';
import { useDevelopmentSettings } from '@/hooks/useDevelopmentSettings';
import { usePullRequestWindow } from '@/hooks/usePullRequestWindow';
import { useStoredChoice } from '@/hooks/useStoredChoice';
import {
    DevelopmentBranch,
    DevelopmentCommit,
    DevelopmentInsights,
    DevelopmentOverview,
} from '@/types/Development';
import { Project } from '@/types/Projects';
import { repositoryLabel } from '@/utils/development';
import { PAGE_SIZES, sinceFor } from '@/utils/developmentSettings';
import { staggerParent } from '@/utils/motion';

/** The most open pull requests whose checks are read for the pass-rate statistic. */
const CI_STATS_SAMPLE = 20;

interface DevelopmentViewProps {
    project: Project;
    development: DevelopmentOverview;
}

/**
 * The project's Development view: a GitHub repository's pull requests, CI,
 * commits, branches and statistics in one place, with the few things you can
 * do about them (link issues, close a pull request, start a branch). The page
 * only hands over what GitHub is connected to; everything else is read over
 * the view's own JSON routes, per repository, and shows a skeleton until it
 * arrives. A change made here (or the refresh button) reads it all again.
 */
export default function DevelopmentView({
    project,
    development,
}: DevelopmentViewProps) {
    const { repositories, canConfigure } = development;

    if (!development.connected) {
        return (
            <DevelopmentEmptyState
                kind="not_connected"
                canConfigure={canConfigure}
            />
        );
    }

    if (repositories.length === 0) {
        return (
            <DevelopmentEmptyState
                kind="no_repositories"
                canConfigure={canConfigure}
            />
        );
    }

    return <DevelopmentBoard project={project} development={development} />;
}

function DevelopmentBoard({
    project,
    development,
}: {
    project: Project;
    development: DevelopmentOverview;
}) {
    const { t } = useLaravelReactI18n();
    const { repositories, abilities, githubLinked } = development;
    const [storedId, setStoredId] = useStoredChoice(
        `developmentRepository.${project.id}`,
        String(repositories[0].id),
        repositories.map((repository) => String(repository.id)),
    );
    const repository =
        repositories.find((candidate) => String(candidate.id) === storedId) ??
        repositories[0];
    const repositoryUrl = `https://github.com/${repositoryLabel(repository)}`;

    const [version, setVersion] = useState(0);
    const [creatingBranch, setCreatingBranch] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const { settings, update, reset } = useDevelopmentSettings();
    const [customizing, setCustomizing] = useState(false);
    const { sections } = settings;
    // The header pills, the numbers and the charts all read the repository's statistics.
    const needInsights = sections.stats || sections.insights;
    const since = useMemo(() => sinceFor(settings.range), [settings.range]);

    const route_ = (name: string) =>
        route(`projects.development.${name}`, { project: project.id });
    // The first page of the range shows at once, older ones arrive behind it.
    const pullRequests = usePullRequestWindow(
        route_('pull-requests.index'),
        {
            repository_id: repository.id,
            state: 'all',
            since,
            limit: settings.pullRequestLimit,
        },
        t('development_view.pull_requests_failed'),
    );
    const insights = useDevelopmentResource<DevelopmentInsights>(
        route_('insights.show'),
        needInsights ? { repository_id: repository.id } : null,
        t('development_view.insights_failed'),
    );
    // The branches page belongs to a repository: another one starts at page 1.
    const [branchesAt, setBranchesAt] = useState({ repository: 0, page: 1 });
    const branchesPage =
        branchesAt.repository === repository.id ? branchesAt.page : 1;
    const branches = useDevelopmentResource<{
        branches: DevelopmentBranch[];
        total: number;
    }>(
        route_('branches.index'),
        sections.branches
            ? {
                  repository_id: repository.id,
                  page: branchesPage,
                  per_page: settings.branchesPerPage,
              }
            : null,
        t('development_view.branches_failed'),
    );
    const defaultBranch = insights.data?.repository.defaultBranch ?? null;
    // No branch is the default branch: the list does not wait for the statistics to say which.
    const commits = useDevelopmentResource<{ commits: DevelopmentCommit[] }>(
        route_('commits.index'),
        sections.commits
            ? {
                  repository_id: repository.id,
                  per_page: settings.commitsShown,
              }
            : null,
        t('development_view.commits_failed'),
    );

    // The checks are read apart from the list (they are the slow part) and
    // only for what is on screen, plus a sample of the open ones for the
    // pass rate; paging to a page already seen costs nothing.
    const [visibleShas, setVisibleShas] = useState<string[]>([]);
    const loadedPullRequests = pullRequests.pullRequests;
    const ciShas = useMemo(
        () => [
            ...visibleShas,
            ...(sections.stats
                ? (loadedPullRequests ?? [])
                      .filter((pr) => pr.state === 'open')
                      .slice(0, CI_STATS_SAMPLE)
                      .map((pr) => pr.headSha)
                : []),
        ],
        [visibleShas, sections.stats, loadedPullRequests],
    );
    const ci = useCiSummaries(
        route_('checks.batch'),
        repository.id,
        ciShas,
        loadedPullRequests !== null,
    );
    const pullRequestsWithCi = useMemo(
        () =>
            loadedPullRequests?.map((pr) =>
                pr.headSha in ci.summaries
                    ? { ...pr, ci: ci.summaries[pr.headSha] }
                    : pr,
            ) ?? null,
        [loadedPullRequests, ci.summaries],
    );

    const { reload: reloadPullRequests } = pullRequests;
    const { reload: reloadInsights } = insights;
    const { reload: reloadBranches } = branches;
    const { reload: reloadCommits } = commits;
    const { reload: reloadCi } = ci;
    const reloadAll = useCallback(() => {
        reloadPullRequests();
        reloadInsights();
        reloadBranches();
        reloadCommits();
        reloadCi();
        setVersion((current) => current + 1);
    }, [
        reloadPullRequests,
        reloadInsights,
        reloadBranches,
        reloadCommits,
        reloadCi,
    ]);

    const actions = useDevelopmentActions(project.id, repository.id, reloadAll);

    const refresh = async () => {
        setRefreshing(true);
        try {
            // The server caches reads for a short while; a refresh drops that.
            await axios.post(route_('refresh'));
        } catch {
            // Reading again still works, from the cache at worst.
        }
        reloadAll();
        setRefreshing(false);
    };

    const repositoryOptions = useMemo(
        () =>
            repositories.map((candidate) => ({
                value: String(candidate.id),
                label: repositoryLabel(candidate),
            })),
        [repositories],
    );
    const loading =
        pullRequests.loading ||
        pullRequests.loadingMore ||
        insights.loading ||
        branches.loading ||
        refreshing;
    const showSide = sections.insights || sections.branches || sections.commits;
    const canCreateBranch = abilities.createBranch && githubLinked;

    return (
        <motion.div
            variants={staggerParent}
            initial="hidden"
            animate="show"
            className="flex flex-1 flex-col gap-4 overflow-y-auto py-4"
        >
            <Reveal className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                    {repositories.length > 1 ? (
                        <div className="w-56 max-w-full">
                            <InlineSelectDropdown
                                label={t('development_view.repository')}
                                placeholder={t('development_view.repository')}
                                options={repositoryOptions}
                                value={String(repository.id)}
                                onChange={(value) =>
                                    value && setStoredId(value)
                                }
                            />
                        </div>
                    ) : (
                        <h3 className="m-0 flex items-center gap-2 text-base font-semibold text-(--text-color)">
                            <Icon
                                name="FolderGit2"
                                size={18}
                                className="text-(--accent-color)"
                            />
                            {repositoryLabel(repository)}
                        </h3>
                    )}
                    {!needInsights ? null : !insights.data ? (
                        <div
                            role="status"
                            aria-label={t(
                                'development_view.loading_repository',
                            )}
                            className="flex items-center gap-2"
                        >
                            <Skeleton className="h-5 w-16 rounded-full" />
                            <Skeleton
                                index={1}
                                className="h-5 w-10 rounded-full"
                            />
                            <Skeleton
                                index={2}
                                className="h-5 w-10 rounded-full"
                            />
                        </div>
                    ) : (
                        <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
                            <li>
                                <StatusPill
                                    tone="neutral"
                                    icon={
                                        insights.data.repository.private
                                            ? 'ShieldCheck'
                                            : 'Eye'
                                    }
                                >
                                    {insights.data.repository.private
                                        ? t('development_view.private')
                                        : t('development_view.public')}
                                </StatusPill>
                            </li>
                            <li>
                                <StatusPill tone="warning" icon="Star">
                                    {insights.data.repository.stars}
                                </StatusPill>
                            </li>
                            <li>
                                <StatusPill tone="info" icon="GitFork">
                                    {insights.data.repository.forks}
                                </StatusPill>
                            </li>
                        </ul>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xs px-2 py-1.5 text-sm text-(--text-gray-color) outline-hidden hover:text-(--text-color) focus-visible:ring-2 focus-visible:ring-(--accent-color)"
                    >
                        <Icon name="ExternalLink" size={14} />
                        {t('development_view.open_on_github')}
                    </a>
                    <IconButton
                        iconName="SlidersHorizontal"
                        iconSize={16}
                        onClick={() => setCustomizing(true)}
                        ariaLabel={t('development_view.customize')}
                        title={t('development_view.customize')}
                        className="outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-color)"
                    />
                    <IconButton
                        iconName="RefreshCw"
                        iconSize={16}
                        onClick={refresh}
                        disabled={loading}
                        ariaLabel={t('development_view.refresh')}
                        title={t('development_view.refresh')}
                        className="outline-hidden focus-visible:ring-2 focus-visible:ring-(--accent-color)"
                    />
                    {canCreateBranch && (
                        <Button
                            type="button"
                            className="px-3 py-1.5"
                            onClick={() => setCreatingBranch(true)}
                        >
                            <Icon name="GitBranch" size={14} />
                            {t('development_view.new_branch')}
                        </Button>
                    )}
                </div>
            </Reveal>

            {sections.stats && (
                <Reveal>
                    <DevelopmentStats
                        pullRequests={pullRequestsWithCi}
                        insights={insights.data}
                        ciPending={ci.pending.size > 0}
                    />
                </Reveal>
            )}

            <div
                className={
                    showSide
                        ? 'grid min-h-0 gap-4 xl:grid-cols-3'
                        : 'grid min-h-0 gap-4'
                }
            >
                <Reveal
                    className={showSide ? 'min-w-0 xl:col-span-2' : 'min-w-0'}
                >
                    <PullRequestsPanel
                        key={repository.id}
                        projectId={project.id}
                        repositoryId={repository.id}
                        repositoryUrl={repositoryUrl}
                        pullRequests={pullRequestsWithCi}
                        loading={pullRequests.loading}
                        loadingMore={pullRequests.loadingMore}
                        capped={pullRequests.capped}
                        limit={settings.pullRequestLimit}
                        rangeLabel={t(
                            `development_settings_modal.ranges.${settings.range}`,
                        )}
                        perPage={settings.pullRequestsPerPage}
                        perPageOptions={[...PAGE_SIZES]}
                        onPerPageChange={(size) =>
                            update({ pullRequestsPerPage: size })
                        }
                        ciPending={ci.pending}
                        onVisibleShas={setVisibleShas}
                        error={pullRequests.error}
                        onRetry={pullRequests.reload}
                        abilities={abilities}
                        githubLinked={githubLinked}
                        version={version}
                        busy={actions.busy}
                        onSetState={actions.setPullRequestState}
                        onLinkIssue={actions.linkIssue}
                        onUnlinkIssue={actions.unlinkIssue}
                    />
                </Reveal>
                {showSide && (
                    <Reveal className="flex min-w-0 flex-col gap-4">
                        {sections.insights && (
                            <RepositoryInsights
                                insights={insights.data}
                                weeks={settings.activityWeeks}
                            />
                        )}
                        {sections.branches && (
                            <BranchesPanel
                                branches={branches.data?.branches ?? null}
                                total={branches.data?.total ?? 0}
                                page={branchesPage}
                                onPageChange={(page) =>
                                    setBranchesAt({
                                        repository: repository.id,
                                        page,
                                    })
                                }
                                perPage={settings.branchesPerPage}
                                perPageOptions={[...PAGE_SIZES]}
                                onPerPageChange={(size) => {
                                    update({ branchesPerPage: size });
                                    setBranchesAt({
                                        repository: repository.id,
                                        page: 1,
                                    });
                                }}
                                error={branches.error}
                                onRetry={branches.reload}
                                onCreate={
                                    canCreateBranch
                                        ? () => setCreatingBranch(true)
                                        : undefined
                                }
                            />
                        )}
                        {sections.commits && (
                            <CommitsPanel
                                commits={commits.data?.commits ?? null}
                                branch={defaultBranch}
                                repositoryUrl={repositoryUrl}
                                error={commits.error}
                                onRetry={commits.reload}
                            />
                        )}
                    </Reveal>
                )}
            </div>

            {customizing && (
                <DevelopmentSettingsModal
                    settings={settings}
                    onChange={update}
                    onReset={reset}
                    onClose={() => setCustomizing(false)}
                />
            )}

            {creatingBranch && (
                <CreateBranchModal
                    projectId={project.id}
                    repositoryId={repository.id}
                    repositoryName={repositoryLabel(repository)}
                    busy={actions.busy}
                    onCreate={actions.createBranch}
                    onClose={() => setCreatingBranch(false)}
                />
            )}
        </motion.div>
    );
}
