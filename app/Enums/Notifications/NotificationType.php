<?php

namespace App\Enums\Notifications;

enum NotificationType: string
{
    case IssueAssigned = 'issue_assigned';
    case IssueMentioned = 'issue_mentioned';
    case IssueCommented = 'issue_commented';
    case IssueStatusChanged = 'issue_status_changed';

    case ProjectInvited = 'project_invited';
}
