<?php

use App\Models\Permission;
use App\Models\Project;
use App\Services\RoleService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('grants the given permission to owner and admin roles without touching other permissions', function () {
    $project = Project::factory()->create();
    $systemRoles = app(RoleService::class)->ensureSystemRoles($project);

    // Simulates a project that existed before this permission did - the
    // admin role never picked it up on creation, and (unlike Owner)
    // nothing resyncs it automatically afterwards.
    $newPermission = Permission::where('key', 'projects.github.development.create')->first();
    $systemRoles['admin']->permissions()->detach($newPermission->id);
    $customPermission = Permission::where('key', 'issues.view')->first();
    $systemRoles['admin']->permissions()->syncWithoutDetaching([$customPermission->id]);

    expect($systemRoles['admin']->permissions()->where('key', 'projects.github.development.create')->exists())->toBeFalse();

    $this->artisan('permissions:grant-to-existing-roles', [
        'keys' => ['projects.github.development.create'],
    ])->assertExitCode(0);

    $systemRoles['admin']->refresh();
    expect($systemRoles['admin']->permissions()->where('key', 'projects.github.development.create')->exists())->toBeTrue()
        ->and($systemRoles['admin']->permissions()->where('key', 'issues.view')->exists())->toBeTrue();
});

test('never touches member or viewer roles by default', function () {
    $project = Project::factory()->create();
    $systemRoles = app(RoleService::class)->ensureSystemRoles($project);
    $systemRoles['member']->permissions()->detach(
        Permission::where('key', 'projects.github.development.create')->first()->id,
    );

    $this->artisan('permissions:grant-to-existing-roles', [
        'keys' => ['projects.github.development.create'],
    ])->assertExitCode(0);

    $systemRoles['member']->refresh();
    expect($systemRoles['member']->permissions()->where('key', 'projects.github.development.create')->exists())->toBeFalse();
});

test('fails cleanly for an unknown permission key', function () {
    Project::factory()->create();

    $this->artisan('permissions:grant-to-existing-roles', [
        'keys' => ['not.a.real.permission'],
    ])->assertExitCode(1);
});

test('is safe to run twice', function () {
    $project = Project::factory()->create();
    app(RoleService::class)->ensureSystemRoles($project);

    $this->artisan('permissions:grant-to-existing-roles', [
        'keys' => ['projects.automation.view', 'projects.automation.update'],
    ])->assertExitCode(0);

    $this->artisan('permissions:grant-to-existing-roles', [
        'keys' => ['projects.automation.view', 'projects.automation.update'],
    ])->assertExitCode(0);
});
