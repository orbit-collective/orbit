<?php

use App\Models\ExternalIssueLink;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use App\Services\IssueTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function actingAsProjectMember(Project $project, string $role = 'member'): User
{
    $user = User::factory()->create();
    $project->users()->attach($user->id, ['role' => $role]);

    return $user;
}

test('an issue detail page can be viewed', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    // The "Issues/Show" frontend page doesn't exist yet (added in a later step), so the
    // Vite manifest has no entry for it. Requesting via the X-Inertia XHR path bypasses
    // the full-page Blade/Vite render and returns the Inertia JSON payload directly.
    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
        ])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['component'])->toBe('Issues/Show')
        ->and($page['props']['issue']['id'])->toBe($issue->id)
        ->and($page['props'])->toHaveKeys(['project', 'projects', 'users']);
});

test('a linked github pull request is exposed with its rich development metadata', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '4580098240',
        'external_key' => 'orbit-collective/orbit#283',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/283',
        'external_type' => 'github_pull_request',
        'pull_request_title' => 'Fix login redirect',
        'source_branch' => 'fix/login-redirect',
        'target_branch' => 'master',
        'status' => 'open',
        'draft' => false,
    ]);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['linkedPullRequests'])->toBe([
        [
            'provider' => 'github',
            'number' => 283,
            'title' => 'Fix login redirect',
            'repositoryOwner' => 'orbit-collective',
            'repositoryName' => 'orbit',
            'url' => 'https://github.com/orbit-collective/orbit/pull/283',
            'sourceBranch' => 'fix/login-redirect',
            'targetBranch' => 'master',
            'status' => 'open',
            'draft' => false,
        ],
    ]);
});

test('a merged or closed pull request status passes through unchanged', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '4580098240',
        'external_key' => 'orbit-collective/orbit#283',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/283',
        'external_type' => 'github_pull_request',
        'status' => 'merged',
        'merged_at' => now(),
    ]);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['linkedPullRequests'][0]['status'])->toBe('merged');
});

test('a legacy linked pull request without metadata renders gracefully with nulls', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '4580098240',
        'external_key' => 'orbit-collective/orbit#283',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/283',
        'external_type' => 'github_pull_request',
    ]);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['linkedPullRequests'])->toBe([
        [
            'provider' => 'github',
            'number' => 283,
            'title' => null,
            'repositoryOwner' => 'orbit-collective',
            'repositoryName' => 'orbit',
            'url' => 'https://github.com/orbit-collective/orbit/pull/283',
            'sourceBranch' => null,
            'targetBranch' => null,
            'status' => null,
            'draft' => null,
        ],
    ]);
});

test('a malformed external_key does not crash the issue page', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '4580098240',
        'external_key' => 'not-the-expected-format',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/283',
        'external_type' => 'github_pull_request',
    ]);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['linkedPullRequests'])->toBe([
        [
            'provider' => 'github',
            'number' => 0,
            'title' => null,
            'repositoryOwner' => 'not-the-expected-format',
            'repositoryName' => '',
            'url' => 'https://github.com/orbit-collective/orbit/pull/283',
            'sourceBranch' => null,
            'targetBranch' => null,
            'status' => null,
            'draft' => null,
        ],
    ]);
});

test('an issue with pull requests from two different repositories shows both, with no duplicates', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '1111',
        'external_key' => 'orbit-collective/orbit#10',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/10',
        'external_type' => 'github_pull_request',
        'status' => 'open',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '2222',
        'external_key' => 'orbit-collective/orbit-api#42',
        'external_url' => 'https://github.com/orbit-collective/orbit-api/pull/42',
        'external_type' => 'github_pull_request',
        'status' => 'open',
    ]);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['linkedPullRequests'])->toHaveCount(2);

    $keys = collect($page['props']['linkedPullRequests'])
        ->map(fn ($pr) => "{$pr['repositoryOwner']}/{$pr['repositoryName']}#{$pr['number']}")
        ->sort()
        ->values()
        ->all();

    expect($keys)->toBe(['orbit-collective/orbit#10', 'orbit-collective/orbit-api#42']);
});

test('a lifecycle sync for one pull request never touches another pull request on the same issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_repository_owner' => 'orbit-collective',
        'github_repository_name' => 'orbit',
    ]);

    $projectIntegration->githubRepositories()->create([
        'repository_id' => 1,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
    ]);

    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '1111',
        'external_key' => 'orbit-collective/orbit#10',
        'external_url' => 'https://github.com/orbit-collective/orbit/pull/10',
        'external_type' => 'github_pull_request',
        'status' => 'open',
    ]);

    $otherLink = ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $projectIntegration->id,
        'external_id' => '2222',
        'external_key' => 'orbit-collective/orbit-api#42',
        'external_url' => 'https://github.com/orbit-collective/orbit-api/pull/42',
        'external_type' => 'github_pull_request',
        'status' => 'open',
    ]);

    $event = new App\DataTransferObjects\Github\GithubRelayEventDTO(
        id: 'evt_1',
        type: 'pull_request',
        action: 'closed',
        deliveryId: 'delivery_1',
        repositoryId: 1,
        pullRequestId: 1111,
        pullRequestNumber: 10,
        pullRequestUrl: 'https://github.com/orbit-collective/orbit/pull/10',
        pullRequestBody: '',
        pullRequestTitle: null,
        pullRequestSourceBranch: null,
        pullRequestTargetBranch: null,
        pullRequestDraft: null,
        pullRequestState: 'closed',
        pullRequestMerged: false,
        pullRequestMergedAt: null,
        pullRequestUpdatedAt: now()->toIso8601String(),
        createdAt: now()->toIso8601String(),
    );

    app(App\Services\Integrations\Github\GithubRelayEventProcessor::class)->process($event, $projectIntegration);

    $otherLink->refresh();

    expect($otherLink->status)->toBe('open');
    $this->assertDatabaseHas('external_issue_links', [
        'external_id' => '1111',
        'status' => 'closed',
    ]);
});

test('the issue page exposes connected github repositories and a default branch name', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Fix login redirect']);
    $user = actingAsProjectMember($project);

    $projectIntegration = ProjectIntegration::query()->create([
        'project_id' => $project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_status' => 'connected',
    ]);
    $projectIntegration->githubRepositories()->create([
        'repository_id' => 1,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
    ]);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['githubRepositories'])->toBe([
        ['id' => 1, 'owner' => 'orbit-collective', 'name' => 'orbit'],
    ]);
    expect($page['props']['githubDefaultBranchName'])->toBe("{$issue->id}-fix-login-redirect");
});

test('the issue page exposes no github repositories when nothing is connected', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true', 'X-Inertia-Version' => $version])
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertOk();
    $page = json_decode($response->getContent(), true);

    expect($page['props']['githubRepositories'])->toBe([]);
});

test('guests cannot view an issue detail page', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $response = $this->get("/projects/$project->id/issues/$issue->id");

    $response->assertRedirect(route('login'));
});

test('an issue detail page 404s when the issue does not belong to the project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $otherProject->id]);

    $response = $this->actingAs(User::factory()->create())
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertNotFound();
});

test('a non-member cannot view an issue detail page', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $response = $this->actingAs(User::factory()->create())
        ->get("/projects/$project->id/issues/$issue->id");

    $response->assertForbidden();
});

test('a project member can create an issue', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'New issue',
        'description' => 'Something to do',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', [
        'title' => 'New issue',
        'project_id' => $project->id,
        'user_id' => $user->id,
    ]);
});

test('a viewer cannot create an issue', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project, 'viewer');

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'New issue',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
    ]);

    $response->assertForbidden();
});

test('a non-member cannot create an issue in a project they do not belong to', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post('/issues', [
        'title' => 'New issue',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
    ]);

    $response->assertForbidden();
});

test('a rejected create request does not seed the target project\'s labels as a side effect', function () {
    $project = Project::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post('/issues', [
        'title' => 'New issue',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'labels' => ['bug'],
    ]);

    $response->assertForbidden();
    $this->assertDatabaseMissing('labels', ['project_id' => $project->id]);
    expect($project->refresh()->labels_seeded_at)->toBeNull();
});

test('creating an issue stamps the authenticated user as the creator', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $this->actingAs($user)->post('/issues', [
        'title' => 'New issue',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
    ]);

    $issue = Issue::where('title', 'New issue')->firstOrFail();
    expect($issue->user_id)->toBe($user->id);
});

test('creating an issue redirects back with a success flash message and an action url', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Flash message issue',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
    ]);

    $issue = Issue::where('title', 'Flash message issue')->firstOrFail();

    $response->assertSessionHas('success', "Issue #$issue->id \"Flash message issue\" has been created successfully.");
    $response->assertSessionHas('action_url', route('projects.show', $project->id).'?issue='.$issue->id);
});

test('creating an issue requires a title, project_id, priority and status', function () {
    $response = $this->actingAs(User::factory()->create())->post('/issues');

    $response->assertSessionHasErrors(['title', 'project_id', 'priority', 'status']);
});

test('creating an issue requires the project_id to reference a real project', function () {
    $response = $this->actingAs(User::factory()->create())->post('/issues', [
        'title' => 'Orphan issue',
        'project_id' => 999999,
        'priority' => 'high',
        'status' => 'open',
    ]);

    $response->assertSessionHasErrors('project_id');
});

test('creating an issue requires the assignee_id to reference a real user when given', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Bad assignee',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'assignee_id' => 999999,
    ]);

    $response->assertSessionHasErrors('assignee_id');
});

test('creating an issue rejects an assignee who is not a member of the project', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);
    $outsider = User::factory()->create();

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Wrong assignee',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'assignee_id' => $outsider->id,
    ]);

    $response->assertSessionHasErrors('assignee_id');
});

test('creating an issue rejects an end_date before the start_date', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Bad dates',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'start_date' => now()->toDateString(),
        'end_date' => now()->subDay()->toDateString(),
    ]);

    $response->assertSessionHasErrors('end_date');
});

test('creating an issue accepts a system label, seeding it automatically', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $this->assertDatabaseMissing('labels', ['project_id' => $project->id, 'name' => 'bug']);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Broken login',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'labels' => ['bug'],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('labels', ['project_id' => $project->id, 'name' => 'bug']);
    $this->assertDatabaseHas('issues', ['title' => 'Broken login', 'labels' => json_encode(['bug'])]);
});

test('creating an issue rejects a label name that does not exist in the project', function () {
    $project = Project::factory()->create();
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Broken login',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'labels' => ['not-a-real-label'],
    ]);

    $response->assertSessionHasErrors('labels.0');
});

test('creating an issue rejects a label that belongs to a different project', function () {
    $project = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $user = actingAsProjectMember($project);
    $otherProject->labels()->create(['name' => 'other-project-label', 'color' => '#000000']);

    $response = $this->actingAs($user)->post('/issues', [
        'title' => 'Broken login',
        'project_id' => $project->id,
        'priority' => 'high',
        'status' => 'open',
        'labels' => ['other-project-label'],
    ]);

    $response->assertSessionHasErrors('labels.0');
});

test('guests cannot create an issue', function () {
    $response = $this->post('/issues');

    $response->assertRedirect(route('login'));
});

test('a project member can update an issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Old title']);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'title' => 'New title',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'title' => 'New title']);
});

test('a viewer cannot update an issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Old title']);
    $user = actingAsProjectMember($project, 'viewer');

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'title' => 'New title',
    ]);

    $response->assertForbidden();
});

test('an Inertia request denied from updating an issue redirects back with a flash error', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Old title']);
    $user = actingAsProjectMember($project, 'viewer');

    $response = $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true'])
        ->patch("/issues/$issue->id", [
            'title' => 'New title',
        ]);

    $response->assertRedirect();
    $response->assertSessionHas('error');

    $manifest = public_path('build/manifest.json');
    $version = file_exists($manifest) ? hash_file('xxh128', $manifest) : '';

    $followUp = $this->actingAs($user)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
        ])
        ->get($response->headers->get('Location'));

    $followUp->assertOk();
    $page = json_decode($followUp->getContent(), true);
    expect($page['props']['flash']['error'] ?? null)->not->toBeNull();
    expect($issue->refresh()->title)->toBe('Old title');
});

test('updating an issue rejects an assignee who is not a member of the project', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);
    $outsider = User::factory()->create();

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'assignee_id' => $outsider->id,
    ]);

    $response->assertSessionHasErrors('assignee_id');
});

test('updating an issue accepts a label that exists in the project, seeding system labels first', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'labels' => []]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'labels' => ['bug'],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'labels' => json_encode(['bug'])]);
});

test('updating an issue rejects a label name that does not exist in the project', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'labels' => []]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'labels' => ['not-a-real-label'],
    ]);

    $response->assertSessionHasErrors('labels.0');
});

test('a non-member cannot update an issue', function () {
    $issue = Issue::factory()->create(['title' => 'Old title']);

    $response = $this->actingAs(User::factory()->create())->patch("/issues/$issue->id", [
        'title' => 'New title',
    ]);

    $response->assertForbidden();
});

test('updating an issue redirects back with a summary of what changed', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Old title', 'priority' => 'low']);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'priority' => 'high',
    ]);

    $response->assertSessionHas(
        'success',
        "Issue #$issue->id \"Old title\" updated: priority changed from \"low\" to \"high\"."
    );
});

test('updating an issue with no actual changes says so in the flash message', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Same title', 'priority' => 'high']);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'priority' => 'high',
    ]);

    $response->assertSessionHas(
        'success',
        "Issue #$issue->id \"Same title\" saved — no changes detected."
    );
});

test('updating a non-existent issue returns a 404', function () {
    $response = $this->actingAs(User::factory()->create())->patch('/issues/999999', [
        'title' => 'Nope',
    ]);

    $response->assertStatus(404);
});

test('updating an issue rejects an end_date before a start_date sent in the same request', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'start_date' => now(),
        'end_date' => now()->addDay(),
    ]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'start_date' => now()->toDateString(),
        'end_date' => now()->subDay()->toDateString(),
    ]);

    $response->assertSessionHasErrors('end_date');
});

// Known gap: `after_or_equal:start_date` only compares against a `start_date` present in
// *this* request's payload, not the issue's persisted value. Sending `end_date` alone skips
// validation entirely and lets an invalid date pair reach the DB, where the check-constraint
// trigger throws a raw exception that Laravel renders as a 500 instead of a normal
// validation redirect.
test('updating only end_date without start_date bypasses validation and returns a server error', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create([
        'project_id' => $project->id,
        'start_date' => now(),
        'end_date' => now()->addDay(),
    ]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'end_date' => now()->subDay()->toDateString(),
    ]);

    $response->assertStatus(500);
});

test('updating an issue rejects an invalid status or priority value type', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'status' => '',
    ]);

    $response->assertSessionHasErrors('status');
});

test('updating an issue accepts in_progress as a valid status', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'status' => 'open']);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'status' => 'in_progress',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('issues', ['id' => $issue->id, 'status' => 'in_progress']);
});

test('updating an issue rejects a status value outside the enum', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->patch("/issues/$issue->id", [
        'status' => 'archived',
    ]);

    $response->assertSessionHasErrors('status');
});

test('guests cannot update an issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->patch("/issues/$issue->id", ['title' => 'Nope']);

    $response->assertRedirect(route('login'));
});

test('a project member can delete an issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id, 'title' => 'Delete me']);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->delete("/issues/$issue->id");

    $response->assertRedirect();
    $response->assertSessionHas('success', "Issue #$issue->id \"Delete me\" has been deleted successfully.");
    $this->assertDatabaseMissing('issues', ['id' => $issue->id]);
});

test('a viewer cannot delete an issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project, 'viewer');

    $response = $this->actingAs($user)->delete("/issues/$issue->id");

    $response->assertForbidden();
    $this->assertDatabaseHas('issues', ['id' => $issue->id]);
});

test('a non-member cannot delete an issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->actingAs(User::factory()->create())->delete("/issues/$issue->id");

    $response->assertForbidden();
});

test('deleting a non-existent issue returns a 404', function () {
    $response = $this->actingAs(User::factory()->create())->delete('/issues/999999');

    $response->assertStatus(404);
});

test('guests cannot delete an issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->delete("/issues/$issue->id");

    $response->assertRedirect(route('login'));
});

test('bulk deleting issues requires ids', function () {
    $response = $this->actingAs(User::factory()->create())->delete('/issues/bulk-destroy');

    $response->assertSessionHasErrors('ids');
});

test('bulk deleting issues requires each id to reference a real issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->actingAs(User::factory()->create())->delete('/issues/bulk-destroy', [
        'ids' => [$issue->id, 999999],
    ]);

    $response->assertSessionHasErrors('ids.1');
});

test('a project member can bulk delete issues', function () {
    $project = Project::factory()->create();
    $issues = Issue::factory()->count(3)->create(['project_id' => $project->id]);
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->delete('/issues/bulk-destroy', [
        'ids' => $issues->pluck('id')->toArray(),
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success', 'Selected issues have been deleted successfully.');

    foreach ($issues as $issue) {
        $this->assertDatabaseMissing('issues', ['id' => $issue->id]);
    }
});

test('bulk deleting rejects the batch if any issue does not belong to the user\'s projects', function () {
    $project = Project::factory()->create();
    $ownIssue = Issue::factory()->create(['project_id' => $project->id]);
    $foreignIssue = Issue::factory()->create();
    $user = actingAsProjectMember($project);

    $response = $this->actingAs($user)->delete('/issues/bulk-destroy', [
        'ids' => [$ownIssue->id, $foreignIssue->id],
    ]);

    $response->assertForbidden();
    $this->assertDatabaseHas('issues', ['id' => $ownIssue->id]);
});

test('guests cannot bulk delete issues', function () {
    $issue = Issue::factory()->create();

    $response = $this->delete('/issues/bulk-destroy', ['ids' => [$issue->id]]);

    $response->assertRedirect(route('login'));
});

test('an issue can be moved to a custom workflow status by id', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    $type = $project->issueTypes()->where('name', 'Task')->first();
    $inReview = $type->statuses()->create([
        'name' => 'In Review', 'color' => '#f59e0b',
        'category' => 'in_progress', 'sort_order' => 5, 'is_initial' => false,
    ]);
    $initial = $type->statuses()->where('is_initial', true)->first();
    $type->transitions()->create(['from_status_id' => $initial->id, 'to_status_id' => $inReview->id]);
    $issue = $project->issues()->create([
        'title' => 'A task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $type->id, 'workflow_status_id' => $initial->id,
        'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", [
        'workflow_status_id' => $inReview->id,
    ]);

    $response->assertRedirect();
    $issue->refresh();
    expect($issue->workflow_status_id)->toBe($inReview->id)
        ->and($issue->status)->toBe('in_progress');
});

test('a workflow status from another issue type is rejected', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $issue = $project->issues()->create([
        'title' => 'A task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $taskType->id,
        'workflow_status_id' => $taskType->statuses()->where('is_initial', true)->first()->id,
        'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", [
        'workflow_status_id' => $bugType->statuses()->first()->id,
    ]);

    $response->assertSessionHasErrors('workflow_status_id');
});

test('a workflow status with no transition from the current one is rejected', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    $type = $project->issueTypes()->where('name', 'Task')->first();
    $initial = $type->statuses()->where('is_initial', true)->first();
    $unreachable = $type->statuses()->create([
        'name' => 'Blocked', 'color' => '#ef4444',
        'category' => 'todo', 'sort_order' => 9, 'is_initial' => false,
    ]);
    $issue = $project->issues()->create([
        'title' => 'A task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $type->id, 'workflow_status_id' => $initial->id,
        'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", [
        'workflow_status_id' => $unreachable->id,
    ]);

    $response->assertSessionHasErrors('status');
});

test('changing the issue type and picking a status of the new type in one request works', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    $taskType = $project->issueTypes()->where('name', 'Task')->first();
    $bugType = $project->issueTypes()->where('name', 'Bug')->first();
    $bugDone = $bugType->statuses()->where('category', 'done')->first();
    $issue = $project->issues()->create([
        'title' => 'A task', 'project_id' => $project->id, 'user_id' => $member->id,
        'issue_type_id' => $taskType->id,
        'workflow_status_id' => $taskType->statuses()->where('is_initial', true)->first()->id,
        'priority' => 'low', 'status' => 'open',
    ]);

    $response = $this->actingAs($member)->patch("/issues/$issue->id", [
        'issue_type_id' => $bugType->id,
        'workflow_status_id' => $bugDone->id,
    ]);

    $response->assertRedirect()->assertSessionHasNoErrors();
    $issue->refresh();
    expect($issue->issue_type_id)->toBe($bugType->id)
        ->and($issue->workflow_status_id)->toBe($bugDone->id)
        ->and($issue->status)->toBe('closed');
});
