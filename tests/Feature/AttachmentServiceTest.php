<?php

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Repositories\AttachmentRepository;
use App\Services\AttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    $this->service = app(AttachmentService::class);
});

test('storeImage stores the file under the project and records it', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $attachment = $this->service->storeImage(
        $project,
        UploadedFile::fake()->create('screenshot.png', 120, 'image/png'),
        $user,
    );

    expect($attachment->project_id)->toBe($project->id)
        ->and($attachment->user_id)->toBe($user->id)
        ->and($attachment->disk)->toBe('local')
        ->and($attachment->original_name)->toBe('screenshot.png')
        ->and($attachment->path)->toStartWith("attachments/$project->id/")
        ->and($attachment->url)->toBe(route('projects.attachments.show', [$project, $attachment]));

    Storage::disk('local')->assertExists($attachment->path);
});

test('delete removes both the stored file and the record', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $attachment = $this->service->storeImage(
        $project,
        UploadedFile::fake()->create('shot.png', 10, 'image/png'),
        $user,
    );

    $this->service->delete($attachment);

    Storage::disk('local')->assertMissing($attachment->path);
    expect(Attachment::query()->count())->toBe(0);
});

test('a failed insert removes the file it had already stored', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $repository = Mockery::mock(AttachmentRepository::class);
    $repository->shouldReceive('create')->once()->andThrow(new RuntimeException('insert failed'));
    $service = new AttachmentService($repository);

    expect(fn () => $service->storeImage(
        $project,
        UploadedFile::fake()->create('shot.png', 10, 'image/png'),
        $user,
    ))->toThrow(RuntimeException::class);

    expect(Storage::disk('local')->allFiles())->toBeEmpty();
});

test('a failed url update rolls back the row and removes the file', function () {
    $project = Project::factory()->create();
    $user = User::factory()->create();

    $repository = Mockery::mock(AttachmentRepository::class);
    $repository->shouldReceive('create')
        ->once()
        ->andReturnUsing(fn (Project $project, array $data) => Attachment::factory()->create(array_merge(['project_id' => $project->id], $data)));
    $repository->shouldReceive('update')->once()->andThrow(new RuntimeException('update failed'));
    $service = new AttachmentService($repository);

    expect(fn () => $service->storeImage(
        $project,
        UploadedFile::fake()->create('shot.png', 10, 'image/png'),
        $user,
    ))->toThrow(RuntimeException::class);

    expect(Storage::disk('local')->allFiles())->toBeEmpty();
    expect(Attachment::query()->count())->toBe(0);
});
