<?php

use App\Models\Issue;
use App\Models\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('rolling back restores label names on issues and in saved filters', function () {
    $project = Project::factory()->create();
    $bug = $project->labels()->create(['name' => 'bug', 'color' => '#f00']);
    $ux = $project->labels()->create(['name' => 'ux', 'color' => '#0f0']);
    $issue = Issue::factory()->create(['project_id' => $project->id, 'labels' => ['bug', 'ux']]);

    $filterId = DB::table('saved_filters')->insertGetId([
        'project_id' => $project->id,
        'name' => 'Bugs and ux',
        'context' => 'project_'.$project->id,
        'query_params' => json_encode(['status' => 'todo', 'labels' => "$bug->id,$ux->id"]),
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    $goneOnly = DB::table('saved_filters')->insertGetId([
        'project_id' => $project->id,
        'name' => 'Deleted label',
        'context' => 'project_'.$project->id,
        'query_params' => json_encode(['labels' => '99999']),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    (require database_path('migrations/2026_10_17_100000_create_issue_label_table.php'))->down();

    $params = fn (int $id) => json_decode(DB::table('saved_filters')->where('id', $id)->value('query_params'), true);

    expect($params($filterId))->toBe(['status' => 'todo', 'labels' => 'bug,ux'])
        ->and($params($goneOnly))->toBe([])
        ->and(json_decode(DB::table('issues')->where('id', $issue->id)->value('labels'), true))->toBe(['bug', 'ux']);
});
