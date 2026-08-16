<?php

use App\Enums\Notifications\NotificationType;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;
use App\Repositories\CommentRepository;
use App\Services\ActivityLogService;
use App\Services\CommentService;
use App\Services\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->commentRepository = Mockery::mock(CommentRepository::class);
    $this->activityLogService = Mockery::mock(ActivityLogService::class);
    $this->notificationService = Mockery::mock(NotificationService::class);
    $this->service = new CommentService($this->commentRepository, $this->activityLogService, $this->notificationService);
});

test('getForIssue delegates to the repository', function () {
    $comments = new Collection;

    $this->commentRepository->shouldReceive('getForIssue')
        ->once()
        ->with(7)
        ->andReturn($comments);

    expect($this->service->getForIssue(7))->toBe($comments);
});

test('addComment stamps the authenticated user, stores the comment and logs activity', function () {
    $user = User::factory()->create(['name' => 'Jane Cooper']);
    $issue = Issue::factory()->create(['id' => 3, 'title' => 'Fix login crash', 'assignee_id' => null]);
    $comment = Comment::factory()->make(['issue_id' => $issue->id, 'user_id' => $user->id]);

    $this->actingAs($user);

    $this->commentRepository->shouldReceive('store')
        ->once()
        ->with(Mockery::on(fn ($data) => $data['issue_id'] === $issue->id && $data['user_id'] === $user->id && $data['body'] === 'Looks good'))
        ->andReturn($comment);

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($issue->project_id, 'Jane Cooper commented on issue #3 "Fix login crash"');

    $result = $this->service->addComment($issue, ['body' => 'Looks good']);

    expect($result)->toBe($comment);
});

test('addComment notifies the assignee when someone else comments', function () {
    $author = User::factory()->create(['name' => 'Jane Cooper']);
    $assignee = User::factory()->create();
    $issue = Issue::factory()->create([
        'id' => 4,
        'title' => 'Fix login crash',
        'assignee_id' => $assignee->id,
    ]);
    $comment = Comment::factory()->make(['issue_id' => $issue->id, 'user_id' => $author->id]);

    $this->actingAs($author);

    $this->commentRepository->shouldReceive('store')->once()->andReturn($comment);
    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldReceive('notify')
        ->once()
        ->with(
            $assignee->id,
            NotificationType::IssueCommented,
            'info',
            'New comment on your issue',
            'Jane Cooper commented on "Fix login crash" (#4).',
            route('issues.show', [$issue->project_id, $issue->id])
        );

    $this->service->addComment($issue, ['body' => 'Looks good']);
});

test('addComment does not notify the assignee when they comment on their own issue', function () {
    $assignee = User::factory()->create();
    $issue = Issue::factory()->create(['assignee_id' => $assignee->id]);
    $comment = Comment::factory()->make(['issue_id' => $issue->id, 'user_id' => $assignee->id]);

    $this->actingAs($assignee);

    $this->commentRepository->shouldReceive('store')->once()->andReturn($comment);
    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldNotReceive('notify');

    $this->service->addComment($issue, ['body' => 'Looks good']);
});

test('addComment does not notify when the issue has no assignee', function () {
    $user = User::factory()->create();
    $issue = Issue::factory()->create(['assignee_id' => null]);
    $comment = Comment::factory()->make(['issue_id' => $issue->id, 'user_id' => $user->id]);

    $this->actingAs($user);

    $this->commentRepository->shouldReceive('store')->once()->andReturn($comment);
    $this->activityLogService->shouldReceive('log')->once();

    $this->notificationService->shouldNotReceive('notify');

    $this->service->addComment($issue, ['body' => 'Looks good']);
});

test('deleteComment removes the comment and logs activity', function () {
    $user = User::factory()->create(['name' => 'Jane Cooper']);
    $issue = Issue::factory()->create(['id' => 5, 'title' => 'Fix login crash']);
    $comment = Comment::factory()->create(['issue_id' => $issue->id]);

    $this->actingAs($user);

    $this->commentRepository->shouldReceive('delete')
        ->once()
        ->with($comment);

    $this->activityLogService->shouldReceive('log')
        ->once()
        ->with($issue->project_id, 'Jane Cooper deleted a comment on issue #5 "Fix login crash"');

    $this->service->deleteComment($comment);
});
