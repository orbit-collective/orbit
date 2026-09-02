<?php

namespace App\Listeners;

use App\Enums\Notifications\NotificationType;
use App\Events\CommentAdded;
use App\Events\IssueAssigned;
use App\Events\IssuesImported;
use App\Events\IssueUnassigned;
use App\Events\IssueUpdated;
use App\Events\ProjectInvited;
use App\Models\Issue;
use App\Notifications\ProjectInvitationMail;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Notification;

/**
 * Single entry point for turning a domain event into an actual notification.
 * Every notification-worthy event in the app routes through handle(), which
 * dispatches on the event's type to a dedicated handler. Adding a new kind
 * of notification (or a new delivery channel inside NotificationService)
 * never requires touching the domain services that fire these events.
 */
class SendNotificationListener
{
    /**
     * Maps a tracked issue field to the notification type that gates it, so each kind of
     * change can be enabled/disabled independently. Fields with no entry here (e.g. title,
     * description) fall back to the generic NotificationType::IssueUpdated.
     */
    private const array FIELD_NOTIFICATION_TYPES = [
        'status' => NotificationType::IssueStatusChanged,
        'priority' => NotificationType::IssuePriorityChanged,
        'labels' => NotificationType::IssueLabelsChanged,
        'start_date' => NotificationType::IssueDatesChanged,
        'end_date' => NotificationType::IssueDatesChanged,
    ];

    /**
     * Subject line per notification type, used for both the in-app title and the email subject.
     */
    private const array UPDATE_SUBJECTS = [
        'issue_status_changed' => 'status changed',
        'issue_priority_changed' => 'priority changed',
        'issue_labels_changed' => 'labels updated',
        'issue_dates_changed' => 'schedule updated',
        'issue_updated' => 'updated',
    ];

    public function __construct(protected NotificationService $notificationService) {}

    public function handle(object $event): void
    {
        match (true) {
            $event instanceof IssueAssigned => $this->handleIssueAssigned($event),
            $event instanceof IssueUnassigned => $this->handleIssueUnassigned($event),
            $event instanceof IssueUpdated => $this->handleIssueUpdated($event),
            $event instanceof CommentAdded => $this->handleCommentAdded($event),
            $event instanceof ProjectInvited => $this->handleProjectInvited($event),
            $event instanceof IssuesImported => $this->handleIssuesImported($event),
            default => null,
        };
    }

    private function handleIssueAssigned(IssueAssigned $event): void
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        $message = "$actorName assigned you to \"$issue->title\" (#$issue->id).";

        if ($otherSummary = $this->summarize($event->otherChanges)) {
            $message .= " Also: $otherSummary.";
        }

        $this->notificationService->notify(
            $event->assignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were assigned to an issue',
            $message,
            $this->buildActionUrl($issue)
        );
    }

    private function handleIssueUnassigned(IssueUnassigned $event): void
    {
        $issue = $event->issue;
        $actorName = $event->actor?->name ?? 'Someone';

        $this->notificationService->notify(
            $event->previousAssignee->id,
            NotificationType::IssueAssigned,
            'info',
            'You were unassigned from an issue',
            "$actorName unassigned you from \"$issue->title\" (#$issue->id).",
            $this->buildActionUrl($issue)
        );
    }

    /**
     * Notifies the actor about their own change, and — only when the assignee didn't
     * just change (that's handled by IssueAssigned/IssueUnassigned instead) — notifies
     * the current assignee too, since the change affects their work.
     */
    private function handleIssueUpdated(IssueUpdated $event): void
    {
        $issue = $event->issue;
        $actor = $event->actor;

        if (! $actor) {
            return;
        }

        $changes = $event->changes;
        $actionUrl = $this->buildActionUrl($issue);

        foreach ($this->groupChangesByNotificationType($changes) as [$type, $groupChanges]) {
            $this->notificationService->notify(
                $actor->id,
                $type,
                'info',
                $this->updateSubject($issue, $type),
                "You updated \"$issue->title\" (#$issue->id): {$this->summarize($groupChanges)}.",
                $actionUrl
            );
        }

        if (array_key_exists('assignee_id', $changes)) {
            return;
        }

        if (! $issue->assignee_id || $issue->assignee_id === $actor->id) {
            return;
        }

        $actorName = $actor->name ?? 'Someone';

        foreach ($this->groupChangesByNotificationType($changes) as [$type, $groupChanges]) {
            $this->notificationService->notify(
                $issue->assignee_id,
                $type,
                'info',
                $this->updateSubject($issue, $type),
                "$actorName updated \"$issue->title\" (#$issue->id), which is assigned to you: {$this->summarize($groupChanges)}.",
                $actionUrl
            );
        }
    }

    private function handleCommentAdded(CommentAdded $event): void
    {
        $issue = $event->issue;

        if (! $issue->assignee_id || $issue->assignee_id === $event->actor?->id) {
            return;
        }

        $actorName = $event->actor?->name ?? 'Someone';

        $this->notificationService->notify(
            $issue->assignee_id,
            NotificationType::IssueCommented,
            'info',
            'New comment on your issue',
            "$actorName commented on \"$issue->title\" (#$issue->id).",
            route('issues.show', [$issue->project_id, $issue->id])
        );
    }

    /**
     * An invited address with no existing account has no notification preferences to
     * respect, so it always gets the dedicated invitation email. An address that
     * already belongs to a user instead goes through the normal notification
     * pipeline, so their own preferences are honored like every other type.
     */
    private function handleProjectInvited(ProjectInvited $event): void
    {
        if (! $event->existingUser) {
            Notification::route('mail', $event->invitation->email)
                ->notify(new ProjectInvitationMail($event->project, $event->invitedBy, $event->acceptUrl));

            return;
        }

        $this->notificationService->notify(
            $event->existingUser->id,
            NotificationType::ProjectInvited,
            'info',
            'You were invited to a project',
            "{$event->invitedBy->name} invited you to join \"{$event->project->name}\".",
            $event->acceptUrl
        );
    }

    private function handleIssuesImported(IssuesImported $event): void
    {
        $result = $event->result;

        $this->notificationService->notify(
            $event->importedBy->id,
            NotificationType::IntegrationActivity,
            $result->failed > 0 ? 'warning' : 'success',
            'Import finished',
            "Imported {$result->imported}, skipped {$result->skipped}, failed {$result->failed} issue(s) into \"{$event->project->name}\".",
            route('settings', ['tab' => 'integrations', 'project' => $event->project->id])
        );
    }

    /**
     * Splits a change set into one bucket per notification type, preserving each field's
     * change data so every bucket can produce its own precise summary sentence.
     *
     * @return list<array{0: NotificationType, 1: array<string, array>}>
     */
    private function groupChangesByNotificationType(array $changes): array
    {
        $groupedByValue = [];

        foreach ($changes as $field => $change) {
            $type = self::FIELD_NOTIFICATION_TYPES[$field] ?? NotificationType::IssueUpdated;
            $groupedByValue[$type->value] ??= ['type' => $type, 'changes' => []];
            $groupedByValue[$type->value]['changes'][$field] = $change;
        }

        return array_map(
            fn ($group) => [$group['type'], $group['changes']],
            array_values($groupedByValue)
        );
    }

    private function updateSubject(Issue $issue, NotificationType $type): string
    {
        $suffix = self::UPDATE_SUBJECTS[$type->value] ?? 'updated';

        return "Issue #$issue->id $suffix";
    }

    private function summarize(array $changes): string
    {
        return implode('; ', array_map(fn ($change) => $change['text'], $changes));
    }

    private function buildActionUrl(Issue $issue): string
    {
        return route('projects.show', $issue->project_id).'?issue='.$issue->id;
    }
}
