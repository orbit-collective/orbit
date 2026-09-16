<?php

use App\Models\Attachment;
use App\Models\Project;
use App\Models\User;
use App\Services\NsfwDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function fakeNsfw(bool $isValid): void
{
    $nsfw = Mockery::mock(NsfwDetectionService::class);
    $nsfw->shouldReceive('validate')->andReturn($isValid);
    app()->instance(NsfwDetectionService::class, $nsfw);
}

test('a project member can upload an image and gets its url back', function () {
    Storage::fake('public');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ]);

    $response->assertCreated();
    expect($response->json('url'))->toStartWith('/storage/attachments/'.$project->id.'/');
    expect($response->json('name'))->toBe('screenshot.png');

    $this->assertDatabaseHas('attachments', [
        'project_id' => $project->id,
        'user_id' => $member->id,
        'original_name' => 'screenshot.png',
        'disk' => 'public',
    ]);

    Storage::disk('public')->assertExists(
        Attachment::query()->first()->path
    );
});

test('an unsafe image is rejected and never stored', function () {
    Storage::fake('public');
    fakeNsfw(false);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('nope.png', 100, 'image/png'),
    ]);

    $response->assertStatus(422);
    $response->assertJson(['message' => 'This image cannot be used.']);
    $this->assertDatabaseCount('attachments', 0);
    expect(Storage::disk('public')->allFiles())->toBeEmpty();
});

test('a moderation service failure fails closed with a retry message', function () {
    Storage::fake('public');

    $nsfw = Mockery::mock(NsfwDetectionService::class);
    $nsfw->shouldReceive('validate')->andThrow(new RuntimeException('down'));
    app()->instance(NsfwDetectionService::class, $nsfw);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('shot.png', 100, 'image/png'),
    ]);

    $response->assertStatus(503);
    $this->assertDatabaseCount('attachments', 0);
});

test('a non image upload is rejected by validation', function () {
    Storage::fake('public');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post(
        "/projects/$project->id/attachments",
        ['file' => UploadedFile::fake()->create('spec.pdf', 10, 'application/pdf')],
        ['Accept' => 'application/json', 'X-Requested-With' => 'XMLHttpRequest'],
    );

    $response->assertStatus(422);
    $response->assertJsonValidationErrors('file');
});

test('a user who is not a project member cannot upload', function () {
    Storage::fake('public');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $outsider = User::factory()->create();

    $response = $this->actingAs($outsider)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('shot.png', 100, 'image/png'),
    ]);

    $response->assertForbidden();
    $this->assertDatabaseCount('attachments', 0);
});

test('a guest is rejected with a 401 rather than a login redirect', function () {
    $project = Project::factory()->create();

    $this->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('shot.png', 100, 'image/png'),
    ])->assertUnauthorized();
});
