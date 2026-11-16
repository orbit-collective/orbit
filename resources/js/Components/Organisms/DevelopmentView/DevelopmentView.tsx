import axios from 'axios';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useCallback, useMemo, useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import StatusPill from '@/Components/Atoms/StatusPill/StatusPill';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import BranchesPanel from '@/Components/Organisms/BranchesPanel/BranchesPanel';
import CommitsPanel from '@/Components/Organisms/CommitsPanel/CommitsPanel';
import CreateBranchModal from '@/Components/Organisms/CreateBranchModal/CreateBranchModal';
import DevelopmentEmptyState from '@/Components/Organisms/DevelopmentEmptyState/DevelopmentEmptyState';
import DevelopmentStats from '@/Components/Organisms/DevelopmentStats/DevelopmentStats';
import PullRequestsPanel, {
    PULL_REQUESTS_PAGE_SIZE,
} from '@/Components/Organisms/PullRequestsPanel/PullRequestsPanel';
import RepositoryInsights from '@/Components/Organisms/RepositoryInsights/RepositoryInsights';
import { useDevelopmentActions } from '@/hooks/useDevelopmentActions';
import { useDevelopmentResource } from '@/hooks/useDevelopmentResource';
import { useStoredChoice } from '@/hooks/useStoredChoice';
import {
    DevelopmentBranch,
    DevelopmentCommit,
    DevelopmentInsights,
    DevelopmentOverview,
    DevelopmentPullRequest,
} from '@/types/Development';
import { Project } from '@/types/Projects';
import { repositoryLabel } from '@/utils/development';
import { staggerParent } from '@/utils/motion';

/** Commits shown beside the pull requests. */
const COMMITS_SHOWN = 8;

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

    const route_ = (name: string) =>
        route(`projects.development.${name}`, { project: project.id });
    const pullRequests = useDevelopmentResource<{
        pullRequests: DevelopmentPullRequest[];
    }>(
        route_('pull-requests.index'),
        {
            repository_id: repository.id,
            state: 'all',
            per_page: PULL_REQUESTS_PAGE_SIZE,
        },
        t('development_view.pull_requests_failed'),
    );
    const insights = useDevelopmentResource<DevelopmentInsights>(
        route_('insights.show'),
        { repository_id: repository.id },
        t('development_view.insights_failed'),
    );
    const branches = useDevelopmentResource<{ branches: DevelopmentBranch[] }>(
        route_('branches.index'),
        { repository_id: repository.id },
        t('development_view.branches_failed'),
    );
    const defaultBranch =
        branches.data?.branches.find((branch) => branch.isDefault)?.name ??
        null;
    const commits = useDevelopmentResource<{ commits: DevelopmentCommit[] }>(
        route_('commits.index'),
        // Waits for the default branch so the list is of that branch, not of "whatever".
        branches.data
            ? {
                  repository_id: repository.id,
                  branch: defaultBranch ?? undefined,
                  per_page: COMMITS_SHOWN,
              }
            : null,
        t('development_view.commits_failed'),
    );

    const { reload: reloadPullRequests } = pullRequests;
    const { reload: reloadInsights } = insights;
    const { reload: reloadBranches } = branches;
    const { reload: reloadCommits } = commits;
    const reloadAll = useCallback(() => {
        reloadPullRequests();
        reloadInsights();
        reloadBranches();
        reloadCommits();
        setVersion((current) => current + 1);
    }, [reloadPullRequests, reloadInsights, reloadBranches, reloadCommits]);

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
        insights.loading ||
        branches.loading ||
        refreshing;
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
                    {insights.data && (
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

            <Reveal>
                <DevelopmentStats
                    pullRequests={pullRequests.data?.pullRequests ?? null}
                    insights={insights.data}
                />
            </Reveal>

            <div className="grid min-h-0 gap-4 xl:grid-cols-3">
                <Reveal className="min-w-0 xl:col-span-2">
                    <PullRequestsPanel
                        projectId={project.id}
                        repositoryId={repository.id}
                        repositoryUrl={repositoryUrl}
                        pullRequests={pullRequests.data?.pullRequests ?? null}
                        loading={pullRequests.loading}
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
                <Reveal className="flex min-w-0 flex-col gap-4">
                    <RepositoryInsights insights={insights.data} />
                    <BranchesPanel
                        branches={branches.data?.branches ?? null}
                        error={branches.error}
                        onRetry={branches.reload}
                        onCreate={
                            canCreateBranch
                                ? () => setCreatingBranch(true)
                                : undefined
                        }
                    />
                    <CommitsPanel
                        commits={commits.data?.commits ?? null}
                        branch={defaultBranch}
                        repositoryUrl={repositoryUrl}
                        error={commits.error}
                        onRetry={commits.reload}
                    />
                </Reveal>
            </div>

            {creatingBranch && (
                <CreateBranchModal
                    repositoryName={repositoryLabel(repository)}
                    branches={branches.data?.branches ?? []}
                    busy={actions.busy}
                    onCreate={actions.createBranch}
                    onClose={() => setCreatingBranch(false)}
                />
            )}
        </motion.div>
    );
}
