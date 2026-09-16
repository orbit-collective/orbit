<?php

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('an attachment belongs to a project and to its uploader', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();
    $attachment = Attachment::factory()->for($project)->for($user)->create();

    expect($attachment->project->id)->toBe($project->id)
        ->and($attachment->user->id)->toBe($user->id);
});

test('a project exposes its attachments', function () {
    $project = Project::factory()->create();
    Attachment::factory()->for($project)->count(2)->create();
    Attachment::factory()->create();

    expect($project->attachments)->toHaveCount(2);
});

test('deleting a project deletes its attachments', function () {
    $project = Project::factory()->create();
    Attachment::factory()->for($project)->create();

    $project->delete();

    expect(Attachment::query()->count())->toBe(0);
});
