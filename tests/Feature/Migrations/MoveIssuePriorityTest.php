<?php

use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

function movePriorityMigration(): object
{
    return require database_path('migrations/2026_10_18_120000_move_issue_priority_to_priorities.php');
}

test('the legacy priority column is gone and issues reference the scale', function () {
    expect(Schema::hasColumn('issues', 'priority'))->toBeFalse()
        ->and(Schema::hasColumn('issues', 'priority_id'))->toBeTrue();
});

test('each legacy word lands on the matching priority of its own project', function () {
    $migration = movePriorityMigration();
    $migration->down();

    $first = Project::factory()->create();
    $second = Project::factory()->create();
    $user = User::factory()->create();
    $insert = fn (Project $project, string $word) => DB::table('issues')->insertGetId([
        'title' => "$word in $project->id",
        'priority' => $word,
        'project_id' => $project->id,
        'user_id' => $user->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $ids = [
        'first high' => $insert($first, 'high'),
        'first low' => $insert($first, 'low'),
        'second medium' => $insert($second, 'medium'),
    ];

    $migration->up();

    $names = collect($ids)->map(fn (int $id) => Issue::find($id)->priority);

    expect($names['first high']->name)->toBe('High')
        ->and($names['first high']->project_id)->toBe($first->id)
        ->and($names['first low']->name)->toBe('Low')
        ->and($names['second medium']->name)->toBe('Medium')
        ->and($names['second medium']->project_id)->toBe($second->id);
});

test('a project is seeded with the starter scale even when it had never opened its priorities', function () {
    $migration = movePriorityMigration();
    $migration->down();
    $project = Project::factory()->create();
    DB::table('issues')->insert([
        'title' => 'Legacy', 'priority' => 'high', 'project_id' => $project->id,
        'user_id' => User::factory()->create()->id, 'created_at' => now(), 'updated_at' => now(),
    ]);
    expect($project->fresh()->priorities_seeded_at)->toBeNull();

    $migration->up();

    expect($project->fresh()->priorities_seeded_at)->not->toBeNull()
        ->and($project->priorities()->orderBy('position')->pluck('name')->all())->toBe(['High', 'Medium', 'Low']);
});

test('rolling back turns the scale back into words, first and last standing for high and low', function () {
    $project = Project::factory()->create();
    $high = Issue::factory()->create(['project_id' => $project->id, 'priority' => 'high']);
    $mid = Issue::factory()->create(['project_id' => $project->id, 'priority' => 'medium']);
    $low = Issue::factory()->create(['project_id' => $project->id, 'priority' => 'low']);

    movePriorityMigration()->down();

    expect(DB::table('issues')->where('id', $high->id)->value('priority'))->toBe('high')
        ->and(DB::table('issues')->where('id', $mid->id)->value('priority'))->toBe('medium')
        ->and(DB::table('issues')->where('id', $low->id)->value('priority'))->toBe('low')
        ->and(Schema::hasColumn('issues', 'priority_id'))->toBeFalse();
});

test('the date-order triggers survive the migration in both directions', function () {
    $migration = movePriorityMigration();
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $insertInverted = fn () => DB::table('issues')->insert([
        'title' => 'Backwards', 'project_id' => $project->id, 'user_id' => $user->id,
        'start_date' => '2026-02-01', 'end_date' => '2026-01-01', 'created_at' => now(), 'updated_at' => now(),
    ]);

    expect($insertInverted)->toThrow(QueryException::class);

    $migration->down();
    expect($insertInverted)->toThrow(QueryException::class);

    $migration->up();
    expect($insertInverted)->toThrow(QueryException::class);
});
