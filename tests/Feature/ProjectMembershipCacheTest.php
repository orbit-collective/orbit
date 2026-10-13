<?php

use App\Enums\Permissions\Permission;
use App\Enums\Permissions\RoleType;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Repositories\ProjectMemberRepository;
use App\Repositories\RoleRepository;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->user = User::factory()->create();
    addProjectMember($this->project, $this->user->id, 'member');
});

function queryCount(Closure $callback): int
{
    DB::flushQueryLog();
    DB::enableQueryLog();
    $callback();
    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    return $count;
}

test('membership is looked up once and then served from the cache', function () {
    $this->project->membershipOf($this->user);

    $queries = queryCount(function () {
        $this->project->hasMember($this->user);
        $this->project->roleOf($this->user);
        $this->project->hasPermission($this->user, Permission::ISSUES_CREATE);
        $this->project->hasPermission($this->user, Permission::ISSUES_CREATE);
    });

    expect($queries)->toBe(0);
});

test('a non-member is cached as a non-member', function () {
    $stranger = User::factory()->create();

    expect($this->project->hasMember($stranger))->toBeFalse();

    $queries = queryCount(fn () => $this->project->hasPermission($stranger, Permission::ISSUES_CREATE));

    expect($queries)->toBe(0)
        ->and($this->project->hasPermission($stranger, Permission::ISSUES_CREATE))->toBeFalse()
        ->and($this->project->roleOf($stranger))->toBeNull();
});

test('membership is cached per project and per user', function () {
    $other = Project::factory()->create();

    expect($this->project->hasMember($this->user))->toBeTrue()
        ->and($other->hasMember($this->user))->toBeFalse();
});

test('the owner has every permission without any granular grant', function () {
    $owner = User::factory()->create();
    addProjectMember($this->project, $owner->id, 'owner');

    expect($this->project->hasPermission($owner, Permission::PROJECT_DELETE))->toBeTrue();
});

test('removing a member takes effect immediately', function () {
    expect($this->project->hasMember($this->user))->toBeTrue();

    (new ProjectMemberRepository)->removeMember($this->project, $this->user->id);

    expect($this->project->hasMember($this->user))->toBeFalse()
        ->and($this->project->hasPermission($this->user, Permission::ISSUES_CREATE))->toBeFalse();
});

test('changing a member\'s role takes effect immediately', function () {
    expect($this->project->roleOf($this->user))->toBe('member');

    app(RoleService::class)->syncSystemRoleForMember($this->project, $this->user->id, RoleType::ADMIN);

    expect($this->project->roleOf($this->user))->toBe('admin');
});

test('granting and revoking a custom role\'s permission takes effect immediately', function () {
    $role = $this->project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = DB::table('permissions')->where('key', Permission::LABELS_CREATE->value)->first();
    $projectUser = ProjectUser::where('project_id', $this->project->id)->where('user_id', $this->user->id)->first();
    $projectUser->roles()->attach($role->id);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeFalse();

    (new RoleRepository)->syncPermissions($role, [$permission->id]);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeTrue();

    (new RoleRepository)->syncPermissions($role, []);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeFalse();
});

test('assigning a custom role to a member takes effect immediately', function () {
    $role = $this->project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = DB::table('permissions')->where('key', Permission::LABELS_CREATE->value)->first();
    (new RoleRepository)->syncPermissions($role, [$permission->id]);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeFalse();

    (new ProjectMemberRepository)->attachRoles($this->project, $this->user->id, [$role->id]);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeTrue();
});

test('deleting a role takes its permissions away immediately', function () {
    $role = $this->project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $permission = DB::table('permissions')->where('key', Permission::LABELS_CREATE->value)->first();
    (new RoleRepository)->syncPermissions($role, [$permission->id]);
    (new ProjectMemberRepository)->attachRoles($this->project, $this->user->id, [$role->id]);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeTrue();

    app(RoleService::class)->deleteRole($this->project, $role);

    expect($this->project->hasPermission($this->user, Permission::LABELS_CREATE))->toBeFalse();
});
