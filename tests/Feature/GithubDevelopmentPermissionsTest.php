<?php

use App\Models\Project;
use App\Models\User;
use App\Policies\ProjectPolicy;

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->policy = new ProjectPolicy;
});

function memberWithTier(Project $project, string $tier): User
{
    $user = User::factory()->create();
    addProjectMember($project, $user->id, $tier);

    return $user;
}

test('owner, admin and member can view and manage the development view', function (string $tier) {
    $user = memberWithTier($this->project, $tier);

    expect($this->policy->viewGithubDevelopment($user, $this->project))->toBeTrue()
        ->and($this->policy->manageGithubDevelopment($user, $this->project))->toBeTrue();
})->with(['owner', 'admin', 'member']);

test('a viewer can look at the development view but not change anything', function () {
    $user = memberWithTier($this->project, 'viewer');

    expect($this->policy->viewGithubDevelopment($user, $this->project))->toBeTrue()
        ->and($this->policy->manageGithubDevelopment($user, $this->project))->toBeFalse();
});

test('a stranger has neither', function () {
    $user = User::factory()->create();

    expect($this->policy->viewGithubDevelopment($user, $this->project))->toBeFalse()
        ->and($this->policy->manageGithubDevelopment($user, $this->project))->toBeFalse();
});
