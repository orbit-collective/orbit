<?php

namespace App\Services;

use App\Events\CommentAdded;
use App\Models\Comment;
use App\Models\Issue;
use App\Repositories\CommentRepository;
use Illuminate\Support\Collection;

class CommentService
{
    public function __construct(
        protected CommentRepository $commentRepository,
        protected ActivityLogService $activityLogService,
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
            event(new CommentAdded($comment, $issue, auth()->user()));
        }

        return $comment;
    }

    public function updateComment(Comment $comment, array $data): Comment
    {
        $issue = $comment->issue;
        $actorName = auth()->user()?->name ?? 'Someone';

        $comment = $this->commentRepository->update($comment, $data);

        $this->activityLogService->log(
            $issue->project_id,
            "$actorName edited a comment on issue #$issue->id \"$issue->title\""
        );

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
