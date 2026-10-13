<?php

namespace Database\Seeders;

use App\Enums\Permissions\RoleType;
use App\Models\ActivityLog;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(PermissionSeeder::class);

        $users = User::factory()->count(10)->create();
        $projects = Project::factory()->count(3)->create();

        $roleService = app(RoleService::class);

        foreach ($projects as $project) {
            $project->users()->attach($users->pluck('id'));
            $roleService->syncSystemRoleForMember($project, $users->first()->id, RoleType::OWNER);

            foreach ($users->slice(1) as $user) {
                $roleService->syncSystemRoleForMember($project, $user->id, RoleType::MEMBER);
            }
        }

        Issue::factory()->count(10)->recycle([$users, $projects])->create();
        ActivityLog::factory()->count(20)->recycle([$users, $projects])->create();
    }
}
