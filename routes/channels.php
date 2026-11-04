<?php

use App\Broadcasting\LiveChannels;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{userId}', fn ($user, int $userId) => LiveChannels::canJoinUser($user, $userId));

Broadcast::channel('project.{projectId}', fn ($user, int $projectId) => LiveChannels::canJoinProject($user, $projectId));

Broadcast::channel('issue.{issueId}', fn ($user, int $issueId) => LiveChannels::joinIssue($user, $issueId));

Broadcast::channel('developer-portal', fn ($user) => LiveChannels::canJoinDeveloperPortal($user));
