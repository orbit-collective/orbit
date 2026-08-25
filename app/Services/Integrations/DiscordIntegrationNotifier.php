<?php

namespace App\Services\Integrations;

use App\Contracts\IntegrationNotifier;
use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Jobs\SendWebhookNotificationJob;
use App\Models\Issue;
use App\Models\ProjectIntegration;
use Illuminate\Support\Str;

/**
 * Turns a domain event into a Discord embed and queues it for delivery to
 * the project's configured webhook. One embed layout per kind of event, so
 * "issue activity" and "comment activity" read differently from each other
 * in the Discord channel, the way the integration's own sub-options are named.
 */
class DiscordIntegrationNotifier implements IntegrationNotifier
{
    private const int COLOR_ASSIGNED = 0x57F287;

    private const int COLOR_UNASSIGNED = 0x99AAB5;

    private const int COLOR_UPDATED = 0x5865F2;

    private const int COLOR_COMMENT = 0xEB459E;

    public function handle(ProjectIntegration $projectIntegration, object $event): void
    {
        if (! $projectIntegration->webhook_url) {
            return;
        }

        $embed = match (true) {
            $event instanceof IssueAssigned => $this->issueAssignedEmbed($event),
            $event instanceof IssueUnassigned => $this->issueUnassignedEmbed($event),
            $event instanceof IssueUpdated => $this->issueUpdatedEmbed($event),
            $event instanceof CommentAdded => $this->commentAddedEmbed($event),
            default => null,
        };

        if (! $embed) {
            return;
        }

        SendWebhookNotificationJob::dispatch($projectIntegration->webhook_url, [
            'username' => 'Orbit',
            'embeds' => [$embed],
        ]);
    }

    private function issueAssignedEmbed(IssueAssigned $event): array
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        return $this->baseEmbed(
            "📌 Issue #$issue->id assigned",
            "**{$event->assignee->name}** was assigned to **\"$issue->title\"** by $actorName.",
            self::COLOR_ASSIGNED,
            $issue,
        );
    }

    private function issueUnassignedEmbed(IssueUnassigned $event): array
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        return $this->baseEmbed(
            "📤 Issue #$issue->id unassigned",
            "**{$event->previousAssignee->name}** was unassigned from **\"$issue->title\"** by $actorName.",
            self::COLOR_UNASSIGNED,
            $issue,
        );
    }

    private function issueUpdatedEmbed(IssueUpdated $event): ?array
    {
        if (! $event->actor) {
            return null;
        }

        $issue = $event->issue;
        $summary = implode("\n", array_map(
            fn (array $change) => "• {$change['text']}",
            $event->changes,
        ));

        return $this->baseEmbed(
            "📝 Issue #$issue->id updated",
            "**{$event->actor->name}** updated **\"$issue->title\"**:\n$summary",
            self::COLOR_UPDATED,
            $issue,
        );
    }

    private function commentAddedEmbed(CommentAdded $event): array
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';
        $body = Str::limit(trim(strip_tags($event->comment->body ?? '')), 300);

        return $this->baseEmbed(
            "💬 New comment on issue #$issue->id",
            "**$actorName** commented on **\"$issue->title\"**:\n> $body",
            self::COLOR_COMMENT,
            $issue,
        );
    }

    private function baseEmbed(string $title, string $description, int $color, Issue $issue): array
    {
        return [
            'title' => $title,
            'description' => $description,
            'color' => $color,
            'url' => $this->buildActionUrl($issue),
            'timestamp' => now()->toIso8601String(),
            'footer' => ['text' => 'Orbit'],
        ];
    }

    private function buildActionUrl(Issue $issue): string
    {
        return route('projects.show', $issue->project_id).'?issue='.$issue->id;
    }
}
