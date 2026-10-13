<?php

use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    // The backfill reads the legacy tier columns, which a later migration
    // drops; rolling that one back recreates them as they were.
    (require database_path('migrations/2026_10_13_110000_drop_legacy_role_columns.php'))->down();
});

function runRoleBackfill(): void
{
    $migration = require database_path('migrations/2026_10_13_100000_backfill_system_roles_for_existing_members.php');
    $migration->up();
}

function systemRoleKeysOf(Project $project, User $user): array
{
    return DB::table('project_user')
        ->where('project_user.project_id', $project->id)
        ->where('project_user.user_id', $user->id)
        ->join('project_user_role', 'project_user_role.project_user_id', '=', 'project_user.id')
        ->join('roles', 'roles.id', '=', 'project_user_role.role_id')
        ->where('roles.is_system', true)
        ->pluck('roles.role')
        ->all();
}

test('every member receives the system role matching their legacy tier', function () {
    $project = Project::factory()->create();
    [$owner, $admin, $member, $viewer] = User::factory()->count(4)->create();

    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($admin->id, ['role' => 'admin']);
    $project->users()->attach($member->id, ['role' => 'member']);
    $project->users()->attach($viewer->id, ['role' => 'viewer']);

    runRoleBackfill();

    expect(systemRoleKeysOf($project, $owner))->toBe(['owner'])
        ->and(systemRoleKeysOf($project, $admin))->toBe(['admin'])
        ->and(systemRoleKeysOf($project, $member))->toBe(['member'])
        ->and(systemRoleKeysOf($project, $viewer))->toBe(['viewer']);
});

test('running it twice changes nothing', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    runRoleBackfill();
    $roles = Role::count();
    $assignments = DB::table('project_user_role')->count();

    runRoleBackfill();

    expect(Role::count())->toBe($roles)
        ->and(DB::table('project_user_role')->count())->toBe($assignments);
});

test('a custom role a member already holds is kept', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);
    $project->users()->attach($member->id, ['role' => 'member']);

    $custom = $project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $pivotId = DB::table('project_user')->where('user_id', $member->id)->value('id');
    DB::table('project_user_role')->insert(['project_user_id' => $pivotId, 'role_id' => $custom->id]);

    runRoleBackfill();

    expect(DB::table('project_user_role')->where('project_user_id', $pivotId)->pluck('role_id')->all())
        ->toContain($custom->id)
        ->toHaveCount(2);
});

test('a customised member role keeps its permissions while owner and admin gain missing ones', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $roles = app(RoleService::class)->ensureSystemRoles($project);
    $member = $roles['member'];
    $admin = $roles['admin'];
    $one = Permission::query()->where('key', 'issues.view')->value('id');
    $member->permissions()->sync([$one]);
    $admin->permissions()->sync([$one]);

    runRoleBackfill();

    expect($member->permissions()->pluck('permissions.id')->all())->toBe([$one])
        ->and($admin->permissions()->count())->toBe(Permission::count());
});

test('a project without an owner promotes its earliest member', function () {
    $project = Project::factory()->create();
    $late = User::factory()->create(['name' => 'Aaron']);
    $early = User::factory()->create(['name' => 'Zed']);

    $project->users()->attach($late->id, ['role' => 'admin']);
    $project->users()->attach($early->id, ['role' => 'member']);
    DB::table('project_user')->where('user_id', $late->id)->update(['created_at' => '2026-02-01 00:00:00']);
    DB::table('project_user')->where('user_id', $early->id)->update(['created_at' => '2026-01-01 00:00:00']);

    runRoleBackfill();

    expect(systemRoleKeysOf($project, $early))->toBe(['owner'])
        ->and(DB::table('project_user')->where('user_id', $early->id)->value('role'))->toBe('owner');
});

test('ties on the join date fall back to the alphabetical name', function () {
    $project = Project::factory()->create();
    $zed = User::factory()->create(['name' => 'Zed', 'created_at' => '2026-01-01 00:00:00']);
    $amy = User::factory()->create(['name' => 'Amy', 'created_at' => '2026-01-01 00:00:00']);

    $project->users()->attach($zed->id, ['role' => 'member']);
    $project->users()->attach($amy->id, ['role' => 'member']);
    DB::table('project_user')->update(['created_at' => '2026-01-01 00:00:00']);

    runRoleBackfill();

    expect(systemRoleKeysOf($project, $amy))->toBe(['owner'])
        ->and(systemRoleKeysOf($project, $zed))->toBe(['member']);
});

test('a project that already has an owner is left alone', function () {
    $project = Project::factory()->create();
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $project->users()->attach($other->id, ['role' => 'admin']);
    $project->users()->attach($owner->id, ['role' => 'owner']);

    runRoleBackfill();

    expect(DB::table('project_user')->where('project_id', $project->id)->where('role', 'owner')->count())->toBe(1)
        ->and(systemRoleKeysOf($project, $owner))->toBe(['owner']);
});

test('pending invitations get their tier as a system role, accepted ones are skipped', function () {
    $project = Project::factory()->create();
    $inviter = User::factory()->create();
    $project->users()->attach($inviter->id, ['role' => 'owner']);

    $invite = fn (string $email, string $role, ?string $acceptedAt) => DB::table('project_invitations')->insertGetId([
        'project_id' => $project->id, 'invited_by' => $inviter->id, 'email' => $email, 'token' => "tok-$email",
        'role' => $role, 'expires_at' => now()->addDay(), 'accepted_at' => $acceptedAt,
    ]);
    $pending = ProjectInvitation::find($invite('a@example.com', 'viewer', null));
    $accepted = ProjectInvitation::find($invite('b@example.com', 'admin', now()));

    runRoleBackfill();

    expect($pending->roles()->pluck('roles.role')->all())->toBe(['viewer'])
        ->and($accepted->roles()->count())->toBe(0);
});

test('an empty project is not given an owner', function () {
    $project = Project::factory()->create();

    runRoleBackfill();

    expect(DB::table('project_user')->where('project_id', $project->id)->count())->toBe(0);
});
