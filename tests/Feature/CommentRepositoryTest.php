<?php

use App\Models\Comment;
use App\Models\Issue;
use App\Repositories\CommentRepository;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->repository = new CommentRepository;
});

test('it can get comments for an issue, oldest first', function () {
    $issue = Issue::factory()->create();
    $otherIssue = Issue::factory()->create();

    $first = Comment::factory()->create(['issue_id' => $issue->id, 'created_at' => now()->subMinutes(10)]);
    $second = Comment::factory()->create(['issue_id' => $issue->id, 'created_at' => now()->subMinutes(5)]);
    Comment::factory()->create(['issue_id' => $otherIssue->id]);

    $comments = $this->repository->getForIssue($issue->id);

    expect($comments)->toHaveCount(2)
        ->and($comments->first()->id)->toBe($first->id)
        ->and($comments->last()->id)->toBe($second->id);
});

test('it can store a new comment', function () {
    $issue = Issue::factory()->create();

    $comment = $this->repository->store([
        'issue_id' => $issue->id,
        'body' => 'A new comment',
    ]);

    expect($comment)->toBeInstanceOf(Comment::class);
    $this->assertDatabaseHas('comments', ['body' => 'A new comment', 'issue_id' => $issue->id]);
});

test('it can delete a comment', function () {
    $comment = Comment::factory()->create();

    $this->repository->delete($comment);

    $this->assertDatabaseMissing('comments', ['id' => $comment->id]);
});
