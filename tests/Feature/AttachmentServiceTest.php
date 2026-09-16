<?php

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Services\AttachmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('public');
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
        ->and($attachment->disk)->toBe('public')
        ->and($attachment->original_name)->toBe('screenshot.png')
        ->and($attachment->path)->toStartWith("attachments/$project->id/")
        ->and($attachment->url)->toBe(Storage::url($attachment->path));

    Storage::disk('public')->assertExists($attachment->path);
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

    Storage::disk('public')->assertMissing($attachment->path);
    expect(Attachment::query()->count())->toBe(0);
});
