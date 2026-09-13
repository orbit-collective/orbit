<?php

use App\Models\Project;
use App\Models\User;
use App\Services\IssueTypeService;
use App\Services\LabelService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/**
 * Exercises every issue type as a root row and as a child of every container
 * type, so a type the UI offers but the backend rejects (or the reverse)
 * shows up here rather than as a "Could not create the issue" toast.
 */
function matrixProject(): array
{
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $project->users()->attach($user->id, ['role' => 'owner']);
    app(IssueTypeService::class)->ensureSystemIssueTypes($project);
    app(LabelService::class)->ensureSystemLabels($project);

    return [$project, $user];
}

test('every top-level type can be created as a root issue', function () {
    [$project, $user] = matrixProject();
    $failures = [];

    foreach ($project->issueTypes()->where('is_top_level', true)->get() as $type) {
        $response = $this->actingAs($user)->post('/issues', [
            'title' => "Root {$type->name}", 'project_id' => $project->id,
            'priority' => 'medium', 'status' => 'open', 'issue_type_id' => $type->id,
        ]);

        if ($response->getSession()->hasOldInput() || $response->getSession()->get('errors')) {
            $failures[$type->name] = $response->getSession()->get('errors')?->getBag('default')->all();
        }
    }

    expect($failures)->toBe([]);
});

test('every sub-issue-only type is rejected as a root issue', function () {
    [$project, $user] = matrixProject();

    foreach ($project->issueTypes()->where('is_top_level', false)->get() as $type) {
        $this->actingAs($user)->post('/issues', [
            'title' => "Root {$type->name}", 'project_id' => $project->id,
            'priority' => 'medium', 'status' => 'open', 'issue_type_id' => $type->id,
        ])->assertSessionHasErrors('issue_type_id');
    }
});

test('each container type accepts exactly the child types it lists', function () {
    [$project, $user] = matrixProject();
    $types = $project->issueTypes()->get();
    $mismatches = [];

    foreach ($types->where('allows_children', true) as $parentType) {
        $parent = $project->issues()->create([
            'title' => "Parent {$parentType->name}", 'project_id' => $project->id, 'user_id' => $user->id,
            'issue_type_id' => $parentType->id, 'priority' => 'medium', 'status' => 'open',
        ]);
        $allowed = $parentType->allowedChildTypes()->pluck('name')->all();

        foreach ($types as $child) {
            $response = $this->actingAs($user)->post('/issues', [
                'title' => "Child {$parentType->name}/{$child->name}", 'project_id' => $project->id,
                'priority' => 'medium', 'status' => 'open',
                'issue_type_id' => $child->id, 'parent_id' => $parent->id,
            ]);

            $succeeded = ! $response->getSession()->get('errors');
            $shouldSucceed = $allowed === [] || in_array($child->name, $allowed, true);

            if ($succeeded !== $shouldSucceed) {
                $mismatches[] = "{$parentType->name} -> {$child->name}: expected "
                    .($shouldSucceed ? 'allow' : 'deny').', got '.($succeeded ? 'allow' : 'deny');
            }
        }
    }

    expect($mismatches)->toBe([]);
});
