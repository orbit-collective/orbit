<?php

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Repositories\AttachmentRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = app(AttachmentRepository::class);
});

test('create attaches the record to the project', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $attachment = $this->repository->create($project, [
        'user_id' => $user->id,
        'disk' => 'public',
        'path' => 'attachments/1/a.png',
        'url' => '/storage/attachments/1/a.png',
        'original_name' => 'a.png',
        'mime_type' => 'image/png',
        'size' => 2048,
    ]);

    expect($attachment->project_id)->toBe($project->id)
        ->and($attachment->size)->toBe(2048);
});

test('findForProject only returns attachments of that project', function () {
    $project = Project::factory()->create();
    $other = Project::factory()->create();
    $attachment = Attachment::factory()->for($project)->create();
    $foreign = Attachment::factory()->for($other)->create();

    expect($this->repository->findForProject($project, $attachment->id)?->id)->toBe($attachment->id)
        ->and($this->repository->findForProject($project, $foreign->id))->toBeNull();
});

test('getForProject returns the project attachments newest first', function () {
    $project = Project::factory()->create();
    $older = Attachment::factory()->for($project)->create(['created_at' => now()->subDay()]);
    $newer = Attachment::factory()->for($project)->create(['created_at' => now()]);
    Attachment::factory()->create();

    expect($this->repository->getForProject($project)->pluck('id')->all())
        ->toBe([$newer->id, $older->id]);
});

test('delete removes the record', function () {
    $attachment = Attachment::factory()->create();

    $this->repository->delete($attachment);

    expect(Attachment::query()->count())->toBe(0);
});
