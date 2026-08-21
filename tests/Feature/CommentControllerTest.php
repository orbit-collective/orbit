<?php

use App\Models\Comment;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('a project member can comment on an issue', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $project->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->post("/issues/{$issue->id}/comments", [
        'body' => 'This looks great!',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('comments', [
        'issue_id' => $issue->id,
        'user_id' => $user->id,
        'body' => 'This looks great!',
    ]);
});

test('commenting on an issue redirects back with a success flash message and an action url', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $project->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->post("/issues/{$issue->id}/comments", [
        'body' => 'Nice work',
    ]);

    $response->assertSessionHas('success', 'Comment added.');
    $response->assertSessionHas('action_url', route('issues.show', [$project->id, $issue->id]));
});

test('commenting on an issue requires a body', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->create();
    $issue->project->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->post("/issues/{$issue->id}/comments", []);

    $response->assertSessionHasErrors('body');
});

test('a viewer cannot comment on an issue', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $user = User::factory()->create();
    $project->users()->attach($user->id, ['role' => 'viewer']);

    $response = $this->actingAs($user)->post("/issues/{$issue->id}/comments", [
        'body' => 'Not allowed',
    ]);

    $response->assertForbidden();
});

test('a non-member cannot comment on an issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/issues/{$issue->id}/comments", [
        'body' => 'Not allowed',
    ]);

    $response->assertForbidden();
});

test('guests cannot comment on an issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->post("/issues/{$issue->id}/comments", ['body' => 'Nope']);

    $response->assertRedirect(route('login'));
});

test('the comment author can delete their own comment', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id]);
    $comment->issue->project->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->delete("/comments/{$comment->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
});

test('a user cannot delete someone else\'s comment', function () {
    $comment = Comment::factory()->create();

    $response = $this->actingAs(User::factory()->create())->delete("/comments/{$comment->id}");

    $response->assertForbidden();
    $this->assertDatabaseHas('comments', ['id' => $comment->id]);
});

test('a plain member cannot delete another member\'s comment', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $author = User::factory()->create();
    $project->users()->attach($author->id, ['role' => 'member']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $author->id]);
    $otherMember = User::factory()->create();
    $project->users()->attach($otherMember->id, ['role' => 'member']);

    $response = $this->actingAs($otherMember)->delete("/comments/{$comment->id}");

    $response->assertForbidden();
    $this->assertDatabaseHas('comments', ['id' => $comment->id]);
});

test('a project owner can delete another member\'s comment', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $author = User::factory()->create();
    $project->users()->attach($author->id, ['role' => 'member']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $author->id]);
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $response = $this->actingAs($owner)->delete("/comments/{$comment->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
});

test('a project admin can delete another member\'s comment', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $author = User::factory()->create();
    $project->users()->attach($author->id, ['role' => 'member']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $author->id]);
    $admin = User::factory()->create();
    $project->users()->attach($admin->id, ['role' => 'admin']);

    $response = $this->actingAs($admin)->delete("/comments/{$comment->id}");

    $response->assertRedirect();
    $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
});

test('guests cannot delete a comment', function () {
    $comment = Comment::factory()->create();

    $response = $this->delete("/comments/{$comment->id}");

    $response->assertRedirect(route('login'));
});

test('the comment author can edit their own comment', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id, 'body' => 'Original']);
    $comment->issue->project->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->patch("/comments/{$comment->id}", [
        'body' => 'Edited',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('comments', ['id' => $comment->id, 'body' => 'Edited']);
});

test('a plain member cannot edit another member\'s comment', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $author = User::factory()->create();
    $project->users()->attach($author->id, ['role' => 'member']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $author->id, 'body' => 'Original']);
    $otherMember = User::factory()->create();
    $project->users()->attach($otherMember->id, ['role' => 'member']);

    $response = $this->actingAs($otherMember)->patch("/comments/{$comment->id}", [
        'body' => 'Edited',
    ]);

    $response->assertForbidden();
    $this->assertDatabaseHas('comments', ['id' => $comment->id, 'body' => 'Original']);
});

test('a project owner can edit another member\'s comment', function () {
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);
    $author = User::factory()->create();
    $project->users()->attach($author->id, ['role' => 'member']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id, 'user_id' => $author->id, 'body' => 'Original']);
    $owner = User::factory()->create();
    $project->users()->attach($owner->id, ['role' => 'owner']);

    $response = $this->actingAs($owner)->patch("/comments/{$comment->id}", [
        'body' => 'Edited by owner',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('comments', ['id' => $comment->id, 'body' => 'Edited by owner']);
});

test('editing a comment requires a body', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id]);
    $comment->issue->project->users()->attach($user->id, ['role' => 'member']);

    $response = $this->actingAs($user)->patch("/comments/{$comment->id}", []);

    $response->assertSessionHasErrors('body');
});

test('guests cannot edit a comment', function () {
    $comment = Comment::factory()->create();

    $response = $this->patch("/comments/{$comment->id}", ['body' => 'Nope']);

    $response->assertRedirect(route('login'));
});
