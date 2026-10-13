<?php

use App\Models\Project;
use App\Models\ProjectInvitation;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function dropLegacyRoleColumns(): object
{
    return require database_path('migrations/2026_10_13_110000_drop_legacy_role_columns.php');
}

test('the tier columns are gone once the migrations have run', function () {
    expect(Schema::hasColumn('project_user', 'role'))->toBeFalse()
        ->and(Schema::hasColumn('project_invitations', 'role'))->toBeFalse();
});

test('rolling back restores the columns from the system roles', function () {
    $project = Project::factory()->create();
    [$owner, $viewer] = User::factory()->count(2)->create();
    addProjectMember($project, $owner->id, 'owner');
    addProjectMember($project, $viewer->id, 'viewer');

    $invitation = ProjectInvitation::create([
        'project_id' => $project->id, 'invited_by' => $owner->id, 'email' => 'a@example.com',
        'token' => 'tok', 'expires_at' => now()->addDay(),
    ]);
    $invitation->roles()->attach(app(RoleService::class)->ensureSystemRoles($project)['admin']->id);

    dropLegacyRoleColumns()->down();

    expect(DB::table('project_user')->where('user_id', $owner->id)->value('role'))->toBe('owner')
        ->and(DB::table('project_user')->where('user_id', $viewer->id)->value('role'))->toBe('viewer')
        ->and(DB::table('project_invitations')->where('id', $invitation->id)->value('role'))->toBe('admin');
});

test('dropping the columns again after a rollback keeps every assignment', function () {
    $project = Project::factory()->create();
    $member = User::factory()->create();
    addProjectMember($project, $member->id, 'member');

    $migration = dropLegacyRoleColumns();
    $migration->down();
    $migration->up();

    expect(Schema::hasColumn('project_user', 'role'))->toBeFalse()
        ->and($project->roleOf($member))->toBe('member');
});
