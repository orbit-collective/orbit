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
    $project = Project::factory()->create();
    $issue = Issue::factory()->create(['project_id' => $project->id]);

    $response = $this->actingAs(User::factory()->create())->post("/issues/{$issue->id}/comments", [
        'body' => 'Nice work',
    ]);

    $response->assertSessionHas('success', 'Comment added.');
    $response->assertSessionHas('action_url', route('issues.show', [$project->id, $issue->id]));
});

test('commenting on an issue requires a body', function () {
    $issue = Issue::factory()->create();

    $response = $this->actingAs(User::factory()->create())->post("/issues/{$issue->id}/comments", []);

    $response->assertSessionHasErrors('body');
});

test('guests cannot comment on an issue', function () {
    $issue = Issue::factory()->create();

    $response = $this->post("/issues/{$issue->id}/comments", ['body' => 'Nope']);

    $response->assertRedirect(route('login'));
});

test('the comment author can delete their own comment', function () {
    $user = User::factory()->create();
    $comment = Comment::factory()->create(['user_id' => $user->id]);

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

test('guests cannot delete a comment', function () {
    $comment = Comment::factory()->create();

    $response = $this->delete("/comments/{$comment->id}");

    $response->assertRedirect(route('login'));
});
