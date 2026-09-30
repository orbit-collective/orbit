<?php

use App\Models\Attachment;
use App\Models\Permission;
use App\Models\Project;
use App\Models\ProjectUser;
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
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $response = $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ]);

    $response->assertCreated();
    $attachment = Attachment::query()->first();
    expect($response->json('url'))->toBe(route('projects.attachments.show', [$project, $attachment]));
    expect($response->json('name'))->toBe('screenshot.png');

    $this->assertDatabaseHas('attachments', [
        'project_id' => $project->id,
        'user_id' => $member->id,
        'original_name' => 'screenshot.png',
        'disk' => 'local',
    ]);

    Storage::disk('local')->assertExists(
        Attachment::query()->first()->path
    );
});

test('an unsafe image is rejected and never stored', function () {
    Storage::fake('local');
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
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
});

test('a moderation service failure fails closed with a retry message', function () {
    Storage::fake('local');

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
    Storage::fake('local');
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

test('a read only viewer cannot upload', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $viewer = User::factory()->create();
    $project->users()->attach($viewer->id, ['role' => 'viewer']);

    $response = $this->actingAs($viewer)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('shot.png', 100, 'image/png'),
    ]);

    $response->assertForbidden();
    $this->assertDatabaseCount('attachments', 0);
    expect(Storage::disk('local')->allFiles())->toBeEmpty();
});

test('a project admin can upload', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $this->actingAs($admin)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('shot.png', 100, 'image/png'),
    ])->assertCreated();
});

test('a viewer with a custom role granting comments.create can upload', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $viewer = User::factory()->create();
    $project->users()->attach($viewer->id, ['role' => 'viewer']);

    $permission = Permission::where('key', 'comments.create')->first();
    $grantingRole = $project->roles()->create(['name' => 'Commenter', 'slug' => 'commenter', 'role' => 'custom']);
    $grantingRole->permissions()->attach($permission);

    $projectUser = ProjectUser::where('project_id', $project->id)->where('user_id', $viewer->id)->first();
    $projectUser->roles()->attach($grantingRole->id);

    $this->actingAs($viewer)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('shot.png', 100, 'image/png'),
    ])->assertCreated();
});

test('a user who is not a project member cannot upload', function () {
    Storage::fake('local');
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

test('a project member can fetch an attachment through the authorized route', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ]);
    $attachment = Attachment::query()->first();

    $response = $this->actingAs($member)->get($attachment->url);

    $response->assertOk();
});

test('a non-member cannot fetch an attachment', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);
    $outsider = User::factory()->create();

    $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ]);
    $attachment = Attachment::query()->first();

    $response = $this->actingAs($outsider)->get($attachment->url);

    $response->assertForbidden();
});

test('a guest fetching an attachment is redirected to login', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $project = Project::factory()->create();
    $member = User::factory()->create();
    $project->users()->attach($member->id, ['role' => 'member']);

    $this->actingAs($member)->post("/projects/$project->id/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ]);
    $attachment = Attachment::query()->first();
    $this->app['auth']->guard()->logout();

    $response = $this->get($attachment->url);

    $response->assertRedirect(route('login'));
});

test('an attachment id from another project 404s instead of leaking through', function () {
    Storage::fake('local');
    fakeNsfw(true);

    $projectA = Project::factory()->create();
    $projectB = Project::factory()->create();
    $member = User::factory()->create();
    $projectA->users()->attach($member->id, ['role' => 'member']);
    $projectB->users()->attach($member->id, ['role' => 'member']);

    $this->actingAs($member)->post("/projects/$projectA->id/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ]);
    $attachment = Attachment::query()->first();

    $response = $this->actingAs($member)->get("/projects/$projectB->id/attachments/$attachment->id");

    $response->assertNotFound();
});
