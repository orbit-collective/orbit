<?php

use App\Broadcasting\LiveChannels;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{userId}', fn ($user, int $userId) => LiveChannels::canJoinUser($user, $userId));

Broadcast::channel('project.{projectId}', fn ($user, int $projectId) => LiveChannels::canJoinProject($user, $projectId));
