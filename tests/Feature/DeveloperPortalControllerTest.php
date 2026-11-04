<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Cache::flush();
    config(['developer-portal.enabled' => true, 'developer-portal.docker.socket' => __FILE__]);
    $this->user = User::factory()->create();
    $this->project = Project::factory()->create(['name' => 'Alpha Portal']);
    addProjectMember($this->project, $this->user->id, 'owner');
});

test('the portal renders totals and both lists immediately and defers the slow reads', function () {
    Issue::factory()->for($this->project)->todo()->create(['user_id' => $this->user->id]);

    $this->actingAs($this->user)->get('/settings/dev-portal')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Settings/DeveloperPortal')
            ->has('projects')
            ->where('totals.issues', 1)
            ->where('totals.projects', 1)
            ->where('portalUsers.total', User::count())
            ->where('portalUsers.data', fn ($rows) => collect($rows)->pluck('email')->contains($this->user->email))
            ->has('portalProjects.data', 1)
            ->where('portalProjects.data.0.name', 'Alpha Portal')
            ->where('portalProjects.data.0.issues.todo', 1)
            ->missing('containers')
            ->missing('errorLog')
        );
});

test('the deferred props load containers and errors on request', function () {
    Http::fake(['localhost/containers/json*' => Http::response([])]);
    $dir = sys_get_temp_dir().'/orbit-portal-'.uniqid();
    mkdir($dir);
    config(['developer-portal.errors.directory' => $dir]);

    $this->actingAs($this->user)
        ->get('/settings/dev-portal', ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()), 'X-Inertia-Partial-Component' => 'Settings/DeveloperPortal', 'X-Inertia-Partial-Data' => 'containers,errorLog'])
        ->assertOk()
        ->assertJsonPath('props.containers.available', true)
        ->assertJsonPath('props.errorLog.entries.data', [])
        ->assertJsonPath('props.errorLog.entries.total', 0);

    rmdir($dir);
});

test('the lists page and search independently', function () {
    User::factory()->count(14)->create();
    User::factory()->create(['name' => 'Searchable Sam']);
    Project::factory()->count(12)->create();

    $this->actingAs($this->user)->get('/settings/dev-portal?users_perPage=5&users_page=2&projects_perPage=20')
        ->assertInertia(fn (Assert $page) => $page
            ->where('portalUsers.current_page', 2)
            ->where('portalUsers.per_page', 5)
            ->has('portalUsers.data', 5)
            ->where('portalProjects.per_page', 20)
            ->has('portalProjects.data', 13)
        );

    $this->actingAs($this->user)->get('/settings/dev-portal?users_search=searchable')
        ->assertInertia(fn (Assert $page) => $page
            ->where('portalUsers.total', 1)
            ->where('portalUsers.data.0.name', 'Searchable Sam')
        );

    $this->actingAs($this->user)->get('/settings/dev-portal?projects_search=alpha')
        ->assertInertia(fn (Assert $page) => $page->where('portalProjects.total', 1));
});

test('a member without the permission cannot read any portal data', function () {
    $member = User::factory()->create();
    addProjectMember($this->project, $member->id, 'member');

    $this->actingAs($member)->get('/settings/dev-portal')->assertForbidden();
});

test('a pager link keeps the other list on its page', function () {
    User::factory()->count(12)->create();
    Project::factory()->count(12)->create();

    $this->actingAs($this->user)->get('/settings/dev-portal?users_perPage=5&projects_page=2&projects_perPage=5')
        ->assertInertia(fn (Assert $page) => $page
            ->where('portalUsers.links.2.url', fn ($url) => str_contains($url, 'projects_page=2') && str_contains($url, 'users_page=2'))
        );
});

test('the error list is paginated and keeps the other pagers in its links', function () {
    $dir = sys_get_temp_dir().'/orbit-portal-'.uniqid();
    mkdir($dir);
    config(['developer-portal.errors.directory' => $dir]);
    $today = now()->format('Y-m-d');
    $lines = '';
    for ($i = 1; $i <= 25; $i++) {
        $lines .= "[$today 10:00:".str_pad((string) $i, 2, '0', STR_PAD_LEFT)."] local.ERROR: failure $i\n";
    }
    file_put_contents($dir.'/laravel.log', $lines);

    $headers = ['X-Inertia' => 'true', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(request()), 'X-Inertia-Partial-Component' => 'Settings/DeveloperPortal', 'X-Inertia-Partial-Data' => 'errorLog'];

    $response = $this->actingAs($this->user)->get('/settings/dev-portal?errors_perPage=10&errors_page=3&users_page=2', $headers)->assertOk();

    $response->assertJsonPath('props.errorLog.entries.total', 25)
        ->assertJsonPath('props.errorLog.entries.current_page', 3)
        ->assertJsonPath('props.errorLog.entries.per_page', 10)
        ->assertJsonCount(5, 'props.errorLog.entries.data')
        ->assertJsonPath('props.errorLog.entries.data.0.message', 'failure 5');
    expect($response->json('props.errorLog.entries.links.1.url'))->toContain('users_page=2');

    array_map('unlink', glob($dir.'/*'));
    rmdir($dir);
});
