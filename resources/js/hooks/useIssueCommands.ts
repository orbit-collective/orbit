import type { FormDataConvertible } from '@inertiajs/core';
import { router, usePage } from '@inertiajs/react';
import { useMemo, useRef } from 'react';
import { useAlert } from '@/context/AlertContext';
import { useCommands } from '@/hooks/useCommands';
import { PageProps } from '@/types';
import { Issue, IssueAbilities } from '@/types/Issues';
import { ProjectLabel } from '@/types/Labels';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { buildIssueCommands } from '@/utils/issueCommands';

const NO_ABILITIES: IssueAbilities = {
    update: false,
    changeStatus: false,
    assign: false,
    changePriority: false,
    changeLabels: false,
};

interface UseIssueCommandsInput {
    project: Project;
    issue: Issue;
    ancestors: Issue[];
    users: AssignableUser[];
    labels: ProjectLabel[];
    abilities?: IssueAbilities;
    /** The page's own PATCH helper, so a palette edit goes through the same route. */
    update: (data: Record<string, FormDataConvertible>) => void;
}

/**
 * Registers the contextual commands of the issue page for as long as it is
 * mounted. Mutations reuse the existing `issues.update` route, so validation,
 * workflow-transition checks, activity logs and notifications are unchanged.
 */
export const useIssueCommands = ({
    project,
    issue,
    ancestors,
    users,
    labels,
    abilities = NO_ABILITIES,
    update,
}: UseIssueCommandsInput): void => {
    const { addAlert } = useAlert();
    // Read through a ref so a provider handing out a fresh `addAlert` never
    // re-registers the commands (which would re-render this page, in a loop).
    const alertRef = useRef(addAlert);
    alertRef.current = addAlert;
    const currentUserId = usePage<PageProps>().props.auth.user.id;

    const commands = useMemo(
        () =>
            buildIssueCommands({
                issue,
                ancestors,
                users,
                labels,
                abilities,
                currentUserId,
                link: route('issues.show', {
                    project: project.id,
                    issue: issue.id,
                }),
                issueUrl: (id) =>
                    route('issues.show', { project: project.id, issue: id }),
                update,
                visit: (url) => router.visit(url),
                copy: (text, successMessage) => {
                    navigator.clipboard
                        ?.writeText(text)
                        .then(() => alertRef.current(successMessage, 'success'))
                        .catch(() =>
                            alertRef.current('Could not copy.', 'error'),
                        );
                },
            }),
        [
            project.id,
            issue,
            ancestors,
            users,
            labels,
            abilities,
            currentUserId,
            update,
        ],
    );

    useCommands(commands);
};
