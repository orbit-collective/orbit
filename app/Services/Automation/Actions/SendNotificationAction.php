<?php

namespace App\Services\Automation\Actions;

use App\Enums\Notifications\NotificationType;
use App\Models\Issue;
use App\Services\NotificationService;

/**
 * params: {title: string, message: string} - notifies the issue's current
 * assignee. A rule with no assignee to notify is a silent no-op, not an
 * error - there is nobody to send it to.
 */
class SendNotificationAction implements AutomationActionHandler
{
    public function __construct(
        protected NotificationService $notificationService,
    ) {}

    public function handle(Issue $issue, array $params): void
    {
        if (! $issue->assignee_id) {
            return;
        }

        $title = $params['title'] ?? 'Automation notification';
        $message = $params['message'] ?? "Automation ran on issue #$issue->id \"$issue->title\".";

        $this->notificationService->notify(
            $issue->assignee_id,
            NotificationType::IssueUpdated,
            'info',
            $title,
            $message,
        );
    }
}
