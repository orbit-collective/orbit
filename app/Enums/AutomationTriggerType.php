<?php

namespace App\Enums;

/**
 * Every trigger a workspace automation rule can fire on. New trigger types
 * are added here and given a context builder at the call site that fires
 * them - see App\Services\Automation\AutomationDispatcher for how a trigger
 * becomes rule evaluation, and App\Services\Integrations\Github for the
 * GitHub-sourced triggers.
 */
enum AutomationTriggerType: string
{
    case IssueStatusChanged = 'issue.status_changed';

    case GithubPullRequestOpened = 'github.pull_request.opened';
    case GithubPullRequestReopened = 'github.pull_request.reopened';
    case GithubPullRequestClosed = 'github.pull_request.closed';
    case GithubPullRequestMerged = 'github.pull_request.merged';
    case GithubPullRequestSynchronized = 'github.pull_request.synchronized';

    /** User-facing name shown in the automation rule builder. */
    public function label(): string
    {
        return match ($this) {
            self::IssueStatusChanged => 'Issue status changed',
            self::GithubPullRequestOpened => 'GitHub pull request opened',
            self::GithubPullRequestReopened => 'GitHub pull request reopened',
            self::GithubPullRequestClosed => 'GitHub pull request closed',
            self::GithubPullRequestMerged => 'GitHub pull request merged',
            self::GithubPullRequestSynchronized => 'GitHub pull request updated',
        };
    }
}
