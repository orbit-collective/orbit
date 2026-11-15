import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo } from 'react';
import { useCommands } from '@/hooks/useCommands';
import { Command } from '@/types/Commands';
import {
    IntegrationDefinition,
    IntegrationId,
    INTEGRATIONS,
} from '@/types/Integrations';
import { GithubConnectStatus } from '@/types/ProjectIntegrations';
import { integrationPath, integrationsPath } from '@/utils/integrationPaths';

/** An integration that has a plain enabled / disabled state to flip. */
const isTogglable = (integration: IntegrationDefinition) =>
    !integration.comingSoon && integration.kind !== 'github';

interface UseIntegrationListCommandsOptions {
    projectId: number | null;
    /** Whether the viewer may change integrations of the project. */
    canUpdate: boolean;
    statuses: Record<string, boolean>;
    onToggle: (integrationId: IntegrationId, enabled: boolean) => void;
}

/**
 * The palette's commands for the integrations overview: open any
 * integration's page, and switch the wired-up ones on or off without
 * leaving the list.
 */
export function useIntegrationListCommands({
    projectId,
    canUpdate,
    statuses,
    onToggle,
}: UseIntegrationListCommandsOptions) {
    const { t } = useLaravelReactI18n();

    const commands = useMemo(
        (): Command[] =>
            INTEGRATIONS.flatMap((integration): Command[] => {
                const keywords = [
                    integration.vendor,
                    integration.category,
                    t('hook_integration_commands.keywords.integration'),
                ];
                const open: Command = {
                    id: `integrations.open.${integration.id}`,
                    title: t('hook_integration_commands.open.title', {
                        name: integration.name,
                    }),
                    group: 'navigation',
                    icon: 'Plug',
                    keywords,
                    perform: () =>
                        router.visit(
                            integrationPath(integration.id, projectId),
                        ),
                };

                if (!canUpdate || !isTogglable(integration)) return [open];

                const enabled = statuses[integration.id] ?? false;

                return [
                    open,
                    {
                        id: `integrations.toggle.${integration.id}`,
                        title: t(
                            enabled
                                ? 'hook_integration_commands.toggle.disable'
                                : 'hook_integration_commands.toggle.enable',
                            { name: integration.name },
                        ),
                        group: 'suggested',
                        icon: enabled ? 'Power' : 'Plug',
                        keywords,
                        perform: () => onToggle(integration.id, !enabled),
                    },
                ];
            }),
        [projectId, canUpdate, statuses, onToggle, t],
    );

    useCommands(commands);
}

interface UseIntegrationCommandsOptions {
    integration: IntegrationDefinition;
    projectId: number | null;
    enabled: boolean;
    canUpdate: boolean;
    githubStatus: GithubConnectStatus | null;
    onToggle: (enabled: boolean) => void;
    onConnectGithub: () => void;
    onDisconnectGithub: () => void;
    onRefreshGithubRepositories: () => void;
}

/**
 * The palette's commands while one integration's page is open: switch it on
 * or off, go back to the list, open the vendor's site and - for GitHub -
 * connect, disconnect and refresh the repositories.
 */
export function useIntegrationCommands({
    integration,
    projectId,
    enabled,
    canUpdate,
    githubStatus,
    onToggle,
    onConnectGithub,
    onDisconnectGithub,
    onRefreshGithubRepositories,
}: UseIntegrationCommandsOptions) {
    const { t } = useLaravelReactI18n();
    const githubState = githubStatus?.status;

    const commands = useMemo((): Command[] => {
        const name = integration.name;
        const keywords = [
            name,
            integration.vendor,
            t('hook_integration_commands.keywords.integration'),
        ];
        const list: Command[] = [
            {
                id: 'integration.back',
                title: t('hook_integration_commands.back.title'),
                group: 'suggested',
                icon: 'ArrowLeft',
                keywords,
                perform: () => router.visit(integrationsPath(projectId)),
            },
            {
                id: 'integration.website',
                title: t('hook_integration_commands.website.title', { name }),
                group: 'suggested',
                icon: 'ExternalLink',
                keywords,
                perform: () =>
                    window.open(
                        integration.websiteUrl,
                        '_blank',
                        'noopener,noreferrer',
                    ),
            },
        ];

        if (canUpdate && isTogglable(integration)) {
            list.push({
                id: 'integration.toggle',
                title: t(
                    enabled
                        ? 'hook_integration_commands.toggle.disable'
                        : 'hook_integration_commands.toggle.enable',
                    { name },
                ),
                group: 'suggested',
                icon: enabled ? 'Power' : 'Plug',
                keywords,
                perform: () => onToggle(!enabled),
            });
        }

        if (
            canUpdate &&
            integration.kind === 'github' &&
            !integration.comingSoon
        ) {
            if (githubState === 'connected') {
                list.push(
                    {
                        id: 'integration.github.refresh',
                        title: t('hook_integration_commands.github.refresh'),
                        group: 'suggested',
                        icon: 'RefreshCw',
                        keywords,
                        perform: onRefreshGithubRepositories,
                    },
                    {
                        id: 'integration.github.disconnect',
                        title: t('hook_integration_commands.github.disconnect'),
                        group: 'suggested',
                        icon: 'Power',
                        keywords,
                        perform: onDisconnectGithub,
                    },
                );
            } else if (githubState !== 'pending') {
                list.push({
                    id: 'integration.github.connect',
                    title: t('hook_integration_commands.github.connect'),
                    group: 'suggested',
                    icon: 'Plug',
                    keywords,
                    perform: onConnectGithub,
                });
            }
        }

        return list;
    }, [
        integration,
        projectId,
        enabled,
        canUpdate,
        githubState,
        onToggle,
        onConnectGithub,
        onDisconnectGithub,
        onRefreshGithubRepositories,
        t,
    ]);

    useCommands(commands);
}
