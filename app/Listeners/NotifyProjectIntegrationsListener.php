<?php

namespace App\Listeners;

use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Models\Project;
use App\Repositories\ProjectIntegrationRepository;
use App\Services\Integrations\IntegrationNotifierRegistry;

/**
 * The integrations counterpart to SendNotificationListener: one entry point
 * for every domain event a project integration might care about. It doesn't
 * know anything about Discord, Slack, or any other specific service — it
 * just figures out which project + sub-option category an event belongs to,
 * finds the project's enabled integrations that opted into that category,
 * and hands each one off to its own IntegrationNotifier (via the registry).
 *
 * Adding a new integration never touches this class: implement
 * IntegrationNotifier and add one line to IntegrationNotifierRegistry.
 */
class NotifyProjectIntegrationsListener
{
    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected IntegrationNotifierRegistry $registry,
    ) {}

    public function handle(object $event): void
    {
        [$project, $category] = $this->resolveContext($event);

        if (! $project || ! $category) {
            return;
        }

        foreach ($this->projectIntegrationRepository->getEnabledForProject($project) as $projectIntegration) {
            if (! ($projectIntegration->options[$category] ?? false)) {
                continue;
            }

            $this->registry->resolve($projectIntegration->integration)?->handle($projectIntegration, $event);
        }
    }

    /**
     * @return array{0: ?Project, 1: ?string}
     */
    private function resolveContext(object $event): array
    {
        return match (true) {
            $event instanceof IssueAssigned,
            $event instanceof IssueUnassigned,
            $event instanceof IssueUpdated => [$event->issue->project, 'issue-activity'],
            $event instanceof CommentAdded => [$event->issue->project, 'comment-activity'],
            default => [null, null],
        };
    }
}
