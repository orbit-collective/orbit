<?php

namespace App\Services;

use App\Enums\Notifications\NotificationType;
use App\Models\Comment;
use App\Models\Issue;
use App\Repositories\CommentRepository;
use Illuminate\Support\Collection;

class CommentService
{
    public function __construct(
        protected CommentRepository $commentRepository,
        protected ActivityLogService $activityLogService,
        protected NotificationService $notificationService
    ) {}

    public function getForIssue(int $issueId): Collection
    {
        return $this->commentRepository->getForIssue($issueId);
    }

    public function addComment(Issue $issue, array $data): Comment
    {
        $data['issue_id'] = $issue->id;
        $data['user_id'] = auth()->id();

        $comment = $this->commentRepository->store($data);

        $actorId = auth()->id();
        $actorName = auth()->user()?->name ?? 'Someone';
        $this->activityLogService->log(
            $issue->project_id,
            "$actorName commented on issue #$issue->id \"$issue->title\""
        );

        if ($issue->assignee_id && $issue->assignee_id !== $actorId) {
            $this->notificationService->notify(
                $issue->assignee_id,
                NotificationType::IssueCommented,
                'info',
                'New comment on your issue',
                "$actorName commented on \"$issue->title\" (#$issue->id).",
                route('issues.show', [$issue->project_id, $issue->id])
            );
        }

        return $comment;
    }

    public function deleteComment(Comment $comment): void
    {
        $issue = $comment->issue;
        $actorName = auth()->user()?->name ?? 'Someone';

        $this->commentRepository->delete($comment);

        $this->activityLogService->log(
            $issue->project_id,
            "$actorName deleted a comment on issue #$issue->id \"$issue->title\""
        );
    }
}
