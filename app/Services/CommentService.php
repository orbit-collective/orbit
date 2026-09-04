<?php

namespace App\Services;

use App\Events\CommentAdded;
use App\Events\IssueMentioned;
use App\Models\Comment;
use App\Models\Issue;
use App\Models\User;
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
        $mentionedUserIds = $this->resolveMentionedUserIds($issue, $data);
        unset($data['mentioned_user_ids']);

        $data['issue_id'] = $issue->id;
        $data['user_id'] = auth()->id();

        $comment = $this->commentRepository->store($data);

        $actorName = auth()->user()?->name ?? 'Someone';

        $this->activityLogService->log(
            $issue->project_id,
            "$actorName commented on issue #$issue->id \"$issue->title\""
        );

        event(new CommentAdded($comment, $issue, auth()->user()));
        $this->fireMentionEvents($issue, $comment, $mentionedUserIds);

        return $comment;
    }

    public function updateComment(Comment $comment, array $data): Comment
    {
        $issue = $comment->issue;
        $actorName = auth()->user()?->name ?? 'Someone';

        $mentionedUserIds = $this->resolveMentionedUserIds($issue, $data);
        unset($data['mentioned_user_ids']);

        $comment = $this->commentRepository->update($comment, $data);

        $this->activityLogService->log(
            $issue->project_id,
            "$actorName edited a comment on issue #$issue->id \"$issue->title\""
        );

        $this->fireMentionEvents($issue, $comment, $mentionedUserIds);

        return $comment;
    }

    /**
     * Keeps only the mentioned user ids that are actually members of the
     * issue's project, so a client can never trigger a mention notification
     * for someone unrelated to the project.
     *
     * @return list<int>
     */
    private function resolveMentionedUserIds(Issue $issue, array $data): array
    {
        $requestedIds = array_unique($data['mentioned_user_ids'] ?? []);
        $requestedIds = array_filter($requestedIds, fn ($id) => $id !== auth()->id());

        if (empty($requestedIds)) {
            return [];
        }

        $memberIds = $issue->project->users()->pluck('users.id')->all();

        return array_values(array_intersect($requestedIds, $memberIds));
    }

    /**
     * @param  list<int>  $mentionedUserIds
     */
    private function fireMentionEvents(Issue $issue, Comment $comment, array $mentionedUserIds): void
    {
        foreach ($mentionedUserIds as $userId) {
            $mentionedUser = User::find($userId);

            if (! $mentionedUser) {
                continue;
            }

            event(new IssueMentioned($issue, $comment, $mentionedUser, auth()->user()));
        }
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
