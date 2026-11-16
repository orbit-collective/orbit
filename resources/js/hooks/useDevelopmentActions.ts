import axios from 'axios';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useCallback, useState } from 'react';
import { useAlert } from '@/context/AlertContext';
import { requestErrorMessage } from '@/hooks/useDevelopmentResource';

/**
 * The writes of the Development view: close or reopen a pull request, link or
 * unlink an issue, start a branch. Each one tells the person what happened
 * (a toast, with the server's own message when it refused), reports whether it
 * worked and, when it did, calls `onChanged` so the view reads GitHub again.
 * One write at a time: `busy` is true while any of them is in flight.
 */
export function useDevelopmentActions(
    projectId: number,
    repositoryId: number | null,
    onChanged: () => void,
) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [busy, setBusy] = useState(false);

    const run = useCallback(
        async (
            request: () => Promise<unknown>,
            success: string,
        ): Promise<boolean> => {
            setBusy(true);
            try {
                await request();
                addAlert(success, 'success');
                onChanged();
                return true;
            } catch (error) {
                addAlert(
                    requestErrorMessage(error, t('development_actions.failed')),
                    'error',
                );
                return false;
            } finally {
                setBusy(false);
            }
        },
        [addAlert, onChanged, t],
    );

    const setPullRequestState = useCallback(
        (number: number, state: 'open' | 'closed') =>
            run(
                () =>
                    axios.post(
                        route('projects.development.pull-requests.state', {
                            project: projectId,
                            number,
                        }),
                        { repository_id: repositoryId, state },
                    ),
                state === 'closed'
                    ? t('development_actions.closed', { number })
                    : t('development_actions.reopened', { number }),
            ),
        [projectId, repositoryId, run, t],
    );

    const linkIssue = useCallback(
        (number: number, issueId: number) =>
            run(
                () =>
                    axios.post(
                        route(
                            'projects.development.pull-requests.issues.store',
                            {
                                project: projectId,
                                number,
                            },
                        ),
                        { repository_id: repositoryId, issue_id: issueId },
                    ),
                t('development_actions.linked', { number }),
            ),
        [projectId, repositoryId, run, t],
    );

    const unlinkIssue = useCallback(
        (number: number, issueId: number) =>
            run(
                () =>
                    axios.delete(
                        route(
                            'projects.development.pull-requests.issues.destroy',
                            { project: projectId, number, issue: issueId },
                        ),
                        { params: { repository_id: repositoryId } },
                    ),
                t('development_actions.unlinked', { number }),
            ),
        [projectId, repositoryId, run, t],
    );

    const createBranch = useCallback(
        (name: string, baseBranch: string | null) =>
            run(
                () =>
                    axios.post(
                        route('projects.development.branches.store', {
                            project: projectId,
                        }),
                        {
                            repository_id: repositoryId,
                            name,
                            ...(baseBranch ? { base_branch: baseBranch } : {}),
                        },
                    ),
                t('development_actions.branch_created', { name }),
            ),
        [projectId, repositoryId, run, t],
    );

    return {
        busy,
        setPullRequestState,
        linkIssue,
        unlinkIssue,
        createBranch,
    };
}
