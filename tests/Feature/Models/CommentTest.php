<?php

use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a factory-created comment persists with the expected attributes', function () {
    $comment = Comment::factory()->create();

    expect($comment->exists)->toBeTrue()
        ->and($comment->body)->toBeString();
});

test('mass assignment via fillable creates a comment', function () {
    $issue = Issue::factory()->create();
    $user = User::factory()->create();

    $comment = Comment::create([
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'body' => 'Looks good to me',
    ]);

    $this->assertDatabaseHas('comments', [
        'id' => $comment->id,
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'body' => 'Looks good to me',
    ]);
});

test('user() belongs to the user referenced by user_id', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id]);

    expect($comment->user())->toBeInstanceOf(BelongsTo::class)
        ->and($comment->user->id)->toBe($user->id);
});

test('issue() belongs to the issue referenced by issue_id', function () {
    $issue = Issue::factory()->create();
    $comment = Comment::factory()->create(['issue_id' => $issue->id]);

    expect($comment->issue())->toBeInstanceOf(BelongsTo::class)
        ->and($comment->issue->id)->toBe($issue->id);
});

test('deleting the issue cascades to delete its comments', function () {
    $issue = Issue::factory()->create();
    $comment = Comment::factory()->create(['issue_id' => $issue->id]);

    $issue->delete();

    $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
});

test('deleting the user cascades to delete their comments', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id]);

    $user->delete();

    $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
});

test('can_edit and can_delete are false with no authenticated user', function () {
    $comment = Comment::factory()->create();

    expect($comment->can_edit)->toBeFalse()
        ->and($comment->can_delete)->toBeFalse();
});

test('can_edit and can_delete are true for the comment author', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id]);
    $comment->issue->project->users()->attach($user->id, ['role' => 'member']);
    $this->actingAs($user);

    expect($comment->can_edit)->toBeTrue()
        ->and($comment->can_delete)->toBeTrue();
});

test('can_edit and can_delete are false for another plain member', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $author = User::factory()->create();
    $project->users()->attach($author->id, ['role' => 'member']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $author->id]);
    $otherMember = User::factory()->create();
    $project->users()->attach($otherMember->id, ['role' => 'member']);
    $this->actingAs($otherMember);

    expect($comment->can_edit)->toBeFalse()
        ->and($comment->can_delete)->toBeFalse();
});
