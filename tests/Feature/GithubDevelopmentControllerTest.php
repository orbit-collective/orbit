<?php

use App\Models\ExternalIssueLink;
use App\Models\GithubRepository;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

const DEV_REPO_ID = 1274545725;

function relayPullRequest(array $overrides = []): array
{
    return [
        'id' => 4580098240,
        'number' => 7,
        'title' => 'Add login',
        'state' => 'open',
        'draft' => false,
        'url' => 'https://github.com/orbit-collective/orbit/pull/7',
        'body' => 'Adds login.',
        'author' => ['login' => 'ada', 'avatarUrl' => 'https://a/1.png'],
        'headBranch' => 'feat/login',
        'headSha' => 'abc',
        'baseBranch' => 'master',
        'labels' => [],
        'requestedReviewers' => [],
        'createdAt' => '2026-11-01T00:00:00Z',
        'updatedAt' => '2026-11-02T00:00:00Z',
        'closedAt' => null,
        'mergedAt' => null,
        'ci' => null,
        'reviewState' => 'approved',
        ...$overrides,
    ];
}

function relayOk(array $data, int $status = 200)
{
    return Http::response(['success' => true, 'data' => $data], $status);
}

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->integration = ProjectIntegration::query()->create([
        'project_id' => $this->project->id,
        'integration' => 'github',
        'enabled' => true,
        'github_relay_token' => 'orb_local_secret',
        'github_status' => 'connected',
    ]);
    GithubRepository::query()->create([
        'project_integration_id' => $this->integration->id,
        'repository_id' => DEV_REPO_ID,
        'owner' => 'orbit-collective',
        'name' => 'orbit',
    ]);
    $this->member = User::factory()->create(['github_id' => '1', 'github_username' => 'octocat']);
    addProjectMember($this->project, $this->member->id, 'member');
    $this->base = "/projects/{$this->project->id}/development";
    $this->query = '?repository_id='.DEV_REPO_ID;
});

test('lists pull requests together with the issues linked to them', function () {
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);
    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id,
        'project_integration_id' => $this->integration->id,
        'external_id' => '4580098240',
        'external_key' => 'orbit-collective/orbit#7',
        'external_type' => 'github_pull_request',
    ]);
    Http::fake(['*/v1/github/pull-requests*' => relayOk(['pullRequests' => [relayPullRequest(), relayPullRequest(['number' => 8, 'id' => 2])]])]);

    $response = $this->actingAs($this->member)->getJson("$this->base/pull-requests$this->query&state=all");

    $response->assertOk()
        ->assertJsonPath('pullRequests.0.number', 7)
        ->assertJsonPath('pullRequests.0.issues.0.id', $issue->id)
        ->assertJsonPath('pullRequests.0.issues.0.number', $issue->number)
        ->assertJsonPath('pullRequests.1.issues', []);

    Http::assertSent(fn ($request) => str_contains($request->url(), 'state=all') && $request->hasHeader('Authorization', 'Bearer orb_local_secret'));
});

test('reads are cached until a write bumps the project scope', function () {
    Http::fake(['*/v1/github/branches*' => relayOk(['branches' => [['name' => 'master', 'sha' => 's', 'protected' => true, 'isDefault' => true]]])]);

    $this->actingAs($this->member)->getJson("$this->base/branches$this->query")->assertOk();
    $this->actingAs($this->member)->getJson("$this->base/branches$this->query")->assertOk();

    Http::assertSentCount(1);
});

test('a viewer may read but a stranger may not', function () {
    Http::fake(['*/v1/github/insights*' => relayOk(['repository' => ['fullName' => 'orbit-collective/orbit'], 'contributors' => [], 'languages' => [], 'commitActivity' => []])]);
    $viewer = User::factory()->create();
    addProjectMember($this->project, $viewer->id, 'viewer');

    $this->actingAs($viewer)->getJson("$this->base/insights$this->query")->assertOk()->assertJsonPath('repository.fullName', 'orbit-collective/orbit');
    $this->actingAs(User::factory()->create())->getJson("$this->base/insights$this->query")->assertForbidden();
});

test('every read passes through to its relay endpoint', function () {
    Http::fake([
        '*/v1/github/commits*' => relayOk(['commits' => [['sha' => 'abc', 'message' => 'm']]]),
        '*/v1/github/checks*' => relayOk(['state' => 'passed', 'total' => 1, 'passed' => 1, 'failed' => 0, 'pending' => 0, 'runs' => []]),
        '*/v1/github/pull-requests*' => relayOk(relayPullRequest()),
    ]);

    $this->actingAs($this->member)->getJson("$this->base/commits$this->query&branch=feat/x")->assertOk()->assertJsonPath('commits.0.sha', 'abc');
    $this->actingAs($this->member)->getJson("$this->base/checks$this->query&ref=abc")->assertOk()->assertJsonPath('state', 'passed');
    $this->actingAs($this->member)->getJson("$this->base/pull-requests/7$this->query")->assertOk()->assertJsonPath('number', 7)->assertJsonPath('issues', []);
});

test('validates the repository id, the state and the ref', function () {
    $this->actingAs($this->member)->getJson("$this->base/pull-requests")->assertJsonValidationErrors('repository_id');
    $this->actingAs($this->member)->getJson("$this->base/pull-requests$this->query&state=merged")->assertJsonValidationErrors('state');
    $this->actingAs($this->member)->getJson("$this->base/checks$this->query&ref=a b")->assertJsonValidationErrors('ref');
    $this->actingAs($this->member)->getJson("$this->base/commits$this->query&per_page=500")->assertJsonValidationErrors('per_page');
});

test('a repository that is not the projects own is refused before any GitHub call', function () {
    Http::fake();

    $this->actingAs($this->member)->getJson("$this->base/branches?repository_id=999")
        ->assertStatus(422)
        ->assertJsonValidationErrors('development');

    Http::assertNothingSent();
});

test('a project without a connected GitHub is refused', function () {
    $this->integration->update(['github_status' => 'pending']);
    Http::fake();

    $this->actingAs($this->member)->getJson("$this->base/branches$this->query")->assertJsonValidationErrors('development');

    Http::assertNothingSent();
});

test('a relay failure becomes a readable validation message', function (?string $code, string $message, string $expected) {
    Http::fake(['*/v1/github/branches*' => Http::response(['success' => false, 'error' => ['code' => $code, 'message' => $message]], 502)]);

    $this->actingAs($this->member)->getJson("$this->base/branches$this->query")
        ->assertStatus(422)
        ->assertJsonPath('errors.development.0', $expected);
})->with([
    'a known code' => ['GITHUB_REPOSITORY_NOT_ALLOWED', 'x', 'That repository is not connected to this project.'],
    'the generic code' => ['GITHUB_API_ERROR', 'GitHub API request failed.', 'GitHub could not be reached.'],
    'orbit-api own message' => ['GITHUB_PULL_REQUEST_REJECTED', 'Validation Failed', 'Validation Failed'],
]);

test('closing a pull request needs manage permission and a linked GitHub account', function () {
    Http::fake(['*/v1/github/pull-request-update' => relayOk(relayPullRequest(['state' => 'closed']))]);
    $url = "$this->base/pull-requests/7/state";

    $viewer = User::factory()->create(['github_id' => '2']);
    addProjectMember($this->project, $viewer->id, 'viewer');
    $this->actingAs($viewer)->postJson($url, ['repository_id' => DEV_REPO_ID, 'state' => 'closed'])->assertForbidden();

    $unlinked = User::factory()->create(['github_id' => null]);
    addProjectMember($this->project, $unlinked->id, 'member');
    $this->actingAs($unlinked)->postJson($url, ['repository_id' => DEV_REPO_ID, 'state' => 'closed'])->assertJsonValidationErrors('development');

    $this->actingAs($this->member)->postJson($url, ['repository_id' => DEV_REPO_ID, 'state' => 'merged'])->assertJsonValidationErrors('state');

    $this->actingAs($this->member)->postJson($url, ['repository_id' => DEV_REPO_ID, 'state' => 'closed'])
        ->assertOk()->assertJsonPath('state', 'closed');

    Http::assertSent(fn ($request) => $request->url() === rtrim(config('services.orbit_api.url'), '/').'/v1/github/pull-request-update'
        && $request['state'] === 'closed' && $request['number'] === 7 && $request['repositoryId'] === DEV_REPO_ID);
});

test('closing leaves the links alone so the webhook can still fire its automations', function () {
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);
    ExternalIssueLink::query()->create([
        'issue_id' => $issue->id, 'project_integration_id' => $this->integration->id,
        'external_id' => '4580098240', 'external_key' => 'orbit-collective/orbit#7', 'external_type' => 'github_pull_request', 'status' => 'open',
    ]);
    Http::fake(['*/v1/github/pull-request-update' => relayOk(relayPullRequest(['state' => 'closed']))]);

    $this->actingAs($this->member)->postJson("$this->base/pull-requests/7/state", ['repository_id' => DEV_REPO_ID, 'state' => 'closed'])->assertOk();

    expect(ExternalIssueLink::query()->value('status'))->toBe('open');
});

test('linking an issue adds its marker to the description and stores the link', function () {
    $issue = Issue::factory()->create(['project_id' => $this->project->id]);
    Http::fake([
        '*/v1/github/pull-requests*' => relayOk(relayPullRequest(['ci' => ['state' => 'passed']])),
        '*/v1/github/pull-request-update' => relayOk(relayPullRequest()),
    ]);

    $this->actingAs($this->member)->postJson("$this->base/pull-requests/7/issues", ['repository_id' => DEV_REPO_ID, 'issue_id' => $issue->id])
        ->assertCreated();

    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/pull-request-update') && $request['body'] === "Adds login.\n\n<!-- orbit-issue:$issue->id -->");
    $link = ExternalIssueLink::query()->firstOrFail();
    expect($link)->issue_id->toBe($issue->id)
        ->external_id->toBe('4580098240')
        ->external_key->toBe('orbit-collective/orbit#7')
        ->status->toBe('open')
        ->source_branch->toBe('feat/login')
        ->check_status->toBe('passed')
        ->review_status->toBe('approved');
});

test('linking a second issue keeps the first one and linking twice changes nothing', function () {
    $first = Issue::factory()->create(['project_id' => $this->project->id]);
    $second = Issue::factory()->create(['project_id' => $this->project->id]);
    Http::fake([
        '*/v1/github/pull-requests*' => relayOk(relayPullRequest(['body' => "Adds login.\n\n<!-- orbit-issue:$first->id -->"])),
        '*/v1/github/pull-request-update' => relayOk(relayPullRequest()),
    ]);

    $link = fn (Issue $issue) => $this->actingAs($this->member)->postJson("$this->base/pull-requests/7/issues", ['repository_id' => DEV_REPO_ID, 'issue_id' => $issue->id])->assertCreated();
    $link($first);
    $link($second);
    $link($second);

    expect(ExternalIssueLink::query()->count())->toBe(2);
    // Linking the first issue only reads (its marker was already there); each
    // link of the second reads and rewrites the description.
    Http::assertSentCount(1 + 2 + 2);
});

test('an issue of another project cannot be linked', function () {
    $foreign = Issue::factory()->create(['project_id' => Project::factory()->create()->id]);
    Http::fake();

    $this->actingAs($this->member)->postJson("$this->base/pull-requests/7/issues", ['repository_id' => DEV_REPO_ID, 'issue_id' => $foreign->id])
        ->assertJsonValidationErrors('issue_id');

    Http::assertNothingSent();
});

test('unlinking removes the marker and the link, and only that issue', function () {
    $keep = Issue::factory()->create(['project_id' => $this->project->id]);
    $drop = Issue::factory()->create(['project_id' => $this->project->id]);
    foreach ([$keep, $drop] as $issue) {
        ExternalIssueLink::query()->create([
            'issue_id' => $issue->id, 'project_integration_id' => $this->integration->id,
            'external_id' => '4580098240', 'external_key' => 'orbit-collective/orbit#7', 'external_type' => 'github_pull_request',
        ]);
    }
    Http::fake([
        '*/v1/github/pull-requests*' => relayOk(relayPullRequest(['body' => "Adds login.\n\n<!-- orbit-issue:$keep->id -->\n\n<!-- orbit-issue:$drop->id -->"])),
        '*/v1/github/pull-request-update' => relayOk(relayPullRequest()),
    ]);

    $this->actingAs($this->member)->deleteJson("$this->base/pull-requests/7/issues/$drop->id$this->query")->assertOk()->assertJsonPath('linked', false);

    expect(ExternalIssueLink::query()->pluck('issue_id')->all())->toBe([$keep->id]);
    Http::assertSent(fn ($request) => str_ends_with($request->url(), '/pull-request-update') && $request['body'] === "Adds login.\n\n<!-- orbit-issue:$keep->id -->");
});

test('creating a branch from the development view', function () {
    Http::fake(['*/v1/github/branches' => relayOk(['name' => 'feat/x', 'url' => 'https://github.com/orbit-collective/orbit/tree/feat/x'], 201)]);

    $this->actingAs($this->member)->postJson("$this->base/branches", ['repository_id' => DEV_REPO_ID, 'name' => 'feat/x', 'base_branch' => 'master'])
        ->assertCreated()
        ->assertJsonPath('name', 'feat/x');

    $viewer = User::factory()->create(['github_id' => '3']);
    addProjectMember($this->project, $viewer->id, 'viewer');
    $this->actingAs($viewer)->postJson("$this->base/branches", ['repository_id' => DEV_REPO_ID, 'name' => 'feat/y'])->assertForbidden();
});

test('a created branch drops the cached branch list', function () {
    Http::fake([
        '*/v1/github/branches*' => Http::sequence()
            ->push(['success' => true, 'data' => ['branches' => []]])
            ->push(['success' => true, 'data' => ['name' => 'feat/x', 'url' => 'u']], 201)
            ->push(['success' => true, 'data' => ['branches' => [['name' => 'feat/x']]]]),
    ]);

    $this->actingAs($this->member)->getJson("$this->base/branches$this->query")->assertJsonPath('branches', []);
    $this->actingAs($this->member)->postJson("$this->base/branches", ['repository_id' => DEV_REPO_ID, 'name' => 'feat/x'])->assertCreated();
    $this->actingAs($this->member)->getJson("$this->base/branches$this->query")->assertJsonPath('branches.0.name', 'feat/x');
});
