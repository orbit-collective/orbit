<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Services\DeveloperPortal\DeveloperPortalAccessService;
use App\Services\RoleService;
use App\Support\Cache\CacheVersion;
use Illuminate\Support\Facades\Process;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
});

function portalMember(string $role): User
{
    $user = User::factory()->create();
    addProjectMember(Project::factory()->create(), $user->id, $role);

    return $user;
}

test('the portal is enabled only when APP_ENV is exactly local', function (string $env, string $expected) {
    // env() is immutable inside this process, so ask a fresh one what the config says for that APP_ENV.
    $result = Process::path(base_path())
        ->env(['APP_ENV' => $env])
        ->run([PHP_BINARY, 'artisan', 'config:show', 'developer-portal.enabled']);

    expect($result->output())->toContain($expected);
})->with([
    ['local', 'true'],
    ['production', 'false'],
    ['prod', 'false'],
    ['staging', 'false'],
]);

test('the portal is off under the test environment by default', function () {
    expect(config('developer-portal.enabled'))->toBeFalse();
});

test('a disabled portal answers 404 even for an owner', function () {
    config(['developer-portal.enabled' => false]);

    $this->actingAs(portalMember('owner'))->get('/settings/dev-portal')->assertNotFound();
});

test('a guest is redirected to login', function () {
    config(['developer-portal.enabled' => true]);

    $this->get('/settings/dev-portal')->assertRedirect('/login');
});

test('a member without the permission gets 403', function () {
    config(['developer-portal.enabled' => true]);

    $this->actingAs(portalMember('member'))->get('/settings/dev-portal')->assertForbidden();
});

test('owners and admins open the portal while it is enabled', function (string $role) {
    config(['developer-portal.enabled' => true]);

    $this->actingAs(portalMember($role))->get('/settings/dev-portal')->assertOk();
})->with(['owner', 'admin']);

test('a custom role granted developer.portal.view opens the portal', function () {
    config(['developer-portal.enabled' => true]);
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'member');
    $role = $project->roles()->create(['name' => 'Dev', 'slug' => 'dev', 'role' => 'custom']);
    $role->permissions()->sync(Permission::where('key', 'developer.portal.view')->pluck('id'));
    ProjectUser::where('user_id', $user->id)->first()->roles()->attach($role->id);

    expect(app(DeveloperPortalAccessService::class)->canAccess($user))->toBeTrue();
});

test('the access check is false for a guest and for a user without projects', function () {
    config(['developer-portal.enabled' => true]);
    $service = app(DeveloperPortalAccessService::class);

    expect($service->canAccess(null))->toBeFalse()
        ->and($service->canAccess(User::factory()->create()))->toBeFalse();
});

test('the shared prop tells the sidebar whether to show the tab', function () {
    config(['developer-portal.enabled' => true]);

    $this->actingAs(portalMember('owner'))->get('/settings/preferences')
        ->assertInertia(fn (Assert $page) => $page->where('developerPortalEnabled', true));

    $this->actingAs(portalMember('member'))->get('/settings/preferences')
        ->assertInertia(fn (Assert $page) => $page->where('developerPortalEnabled', false));

    config(['developer-portal.enabled' => false]);

    $this->actingAs(portalMember('owner'))->get('/settings/preferences')
        ->assertInertia(fn (Assert $page) => $page->where('developerPortalEnabled', false));
});

test('the migration grants the permission to existing owner and admin roles only', function () {
    $permission = Permission::where('key', 'developer.portal.view')->first();
    $project = Project::factory()->create();
    $roles = app(RoleService::class)->ensureSystemRoles($project);
    $roles['admin']->permissions()->detach($permission->id);
    $roles['owner']->permissions()->detach($permission->id);

    $migration = require database_path('migrations/2026_11_04_120000_add_developer_portal_permission.php');
    $migration->up();
    $migration->up();

    expect($roles['owner']->permissions()->where('key', 'developer.portal.view')->exists())->toBeTrue()
        ->and($roles['admin']->permissions()->where('key', 'developer.portal.view')->exists())->toBeTrue()
        ->and($roles['member']->permissions()->where('key', 'developer.portal.view')->exists())->toBeFalse();

    $migration->down();

    expect(Permission::where('key', 'developer.portal.view')->exists())->toBeFalse();
});

test('rolling the migration back retires cached access at once', function () {
    config(['developer-portal.enabled' => true]);
    $user = User::factory()->create();
    $project = Project::factory()->create();
    addProjectMember($project, $user->id, 'admin');

    // The admin's membership (and its permission list) is now cached.
    expect(app(DeveloperPortalAccessService::class)->canAccess($user))->toBeTrue();
    $before = CacheVersion::current(CacheVersion::MEMBERSHIP);

    $migration = require database_path('migrations/2026_11_04_120000_add_developer_portal_permission.php');
    $migration->down();

    expect(CacheVersion::current(CacheVersion::MEMBERSHIP))->toBeGreaterThan($before)
        ->and(app(DeveloperPortalAccessService::class)->canAccess($user))->toBeFalse();
});
