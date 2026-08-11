<?php

namespace App\Enums\Notifications;

enum NotificationType: string
{
    case IssueAssigned = 'issue_assigned';
    case IssueMentioned = 'issue_mentioned';
    case IssueCommented = 'issue_commented';
    case IssueStatusChanged = 'issue_status_changed';
    case IssuePriorityChanged = 'issue_priority_changed';
    case IssueLabelsChanged = 'issue_labels_changed';
    case IssueDatesChanged = 'issue_dates_changed';
    case IssueUpdated = 'issue_updated';

    case ProjectInvited = 'project_invited';
}
