<?php

use App\Enums\Permissions\RoleType;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
use App\Models\User;
use App\Repositories\ProjectMemberRepository;
use App\Repositories\ProjectRepository;
use App\Repositories\RoleRepository;
use App\Repositories\UserRepository;
use App\Services\ProjectInvitationService;
use App\Support\Cache\CacheVersion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

/**
 * Everything cached under the membership scope (project lists, role and
 * permission lookups) is only as fresh as these bumps, so every write that can
 * change who belongs to a project or what they may do must move the version.
 */
function expectMembershipBump(Closure $write): void
{
    $before = CacheVersion::current(CacheVersion::MEMBERSHIP);

    $write();

    expect(CacheVersion::current(CacheVersion::MEMBERSHIP))->toBeGreaterThan($before);
}

beforeEach(function () {
    $this->project = Project::factory()->create();
    $this->user = User::factory()->create();
    $this->project->users()->attach($this->user->id, ['role' => 'member']);
    $this->members = new ProjectMemberRepository;
    $this->roles = new RoleRepository;
});

test('attaching a member bumps the membership version', function () {
    $other = User::factory()->create();

    expectMembershipBump(fn () => (new ProjectRepository)->attachMember($this->project, $other->id, RoleType::MEMBER));
});

test('changing, removing or re-roling a member bumps the membership version', function () {
    $custom = $this->project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);
    $system = $this->roles->firstOrCreateSystemRole($this->project, RoleType::ADMIN);

    expectMembershipBump(fn () => $this->members->updateRole($this->project, $this->user->id, RoleType::ADMIN));
    expectMembershipBump(fn () => $this->members->syncRoles($this->project, $this->user->id, [$custom->id]));
    expectMembershipBump(fn () => $this->members->attachRoles($this->project, $this->user->id, [$custom->id]));
    expectMembershipBump(fn () => $this->members->syncSystemRole($this->project, $this->user->id, $system, [$system->id]));
    expectMembershipBump(fn () => $this->members->removeMember($this->project, $this->user->id));
});

test('updating or deleting a project bumps the membership version', function () {
    expectMembershipBump(fn () => (new ProjectRepository)->update($this->project, ['name' => 'Renamed']));
    expectMembershipBump(fn () => (new ProjectRepository)->delete($this->project));
});

test('changing a role\'s permissions or deleting the role bumps the membership version', function () {
    $role = $this->project->roles()->create(['name' => 'QA', 'slug' => 'qa', 'role' => 'custom']);

    expectMembershipBump(fn () => $this->roles->syncPermissions($role, Permission::query()->limit(2)->pluck('id')->all()));
    expectMembershipBump(fn () => $this->roles->delete($role));
});

test('accepting an invitation bumps the membership version', function () {
    Notification::fake();
    config(['mail.default' => 'smtp']);
    $invitee = User::factory()->create(['email' => 'invitee@example.com']);
    $service = app(ProjectInvitationService::class);
    $invitation = $service->invite($this->project, 'invitee@example.com', RoleType::MEMBER, $this->user);

    expectMembershipBump(fn () => $service->acceptByToken($invitation->token, $invitee));

    expect(ProjectUser::where('user_id', $invitee->id)->exists())->toBeTrue();
});

test('deleting an account bumps the membership version', function () {
    expectMembershipBump(fn () => (new UserRepository)->delete($this->user));
});
