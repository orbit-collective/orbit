<?php

namespace App\Services;

use App\Events\CommentAdded;
use App\Events\IssueMentioned;
use App\Models\Comment;
use App\Models\Issue;
use App\Repositories\CommentRepository;
use App\Repositories\ProjectRepository;
use App\Repositories\UserRepository;
use Illuminate\Support\Collection;

class CommentService
{
    public function __construct(
        protected CommentRepository $commentRepository,
        protected ActivityLogService $activityLogService,
        protected ProjectRepository $projectRepository,
        protected UserRepository $userRepository,
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

        // Diffed against the ids already mentioned in the comment's body
        // before this edit, so re-saving a comment (even for an unrelated
        // change) doesn't re-notify members who were already mentioned and
        // already notified — only ids newly added by this edit fire.
        $previouslyMentionedIds = $this->extractMentionTokenIds($comment->body);
        $mentionedUserIds = $this->resolveMentionedUserIds($issue, $data);
        $newlyMentionedUserIds = array_values(array_diff($mentionedUserIds, $previouslyMentionedIds));
        unset($data['mentioned_user_ids']);

        $comment = $this->commentRepository->update($comment, $data);

        $this->activityLogService->log(
            $issue->project_id,
            "$actorName edited a comment on issue #$issue->id \"$issue->title\""
        );

        $this->fireMentionEvents($issue, $comment, $newlyMentionedUserIds);

        return $comment;
    }

    /**
     * Keeps only the mentioned user ids that are (a) actually members of the
     * issue's project, and (b) actually referenced by an "@[Name](id)"
     * mention token in the comment body — a client can't claim
     * mentioned_user_ids for someone the visible comment text never
     * actually mentions.
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

        $tokenIds = $this->extractMentionTokenIds($data['body'] ?? '');
        $requestedIds = array_intersect($requestedIds, $tokenIds);

        if (empty($requestedIds)) {
            return [];
        }

        $memberIds = $this->projectRepository->getMemberIds($issue->project);

        return array_values(array_intersect($requestedIds, $memberIds));
    }

    /**
     * @return list<int>
     */
    private function extractMentionTokenIds(string $body): array
    {
        preg_match_all('/@\[[^\]]+\]\((\d+)\)/', $body, $matches);

        return array_map('intval', $matches[1] ?? []);
    }

    /**
     * @param  list<int>  $mentionedUserIds
     */
    private function fireMentionEvents(Issue $issue, Comment $comment, array $mentionedUserIds): void
    {
        foreach ($mentionedUserIds as $userId) {
            $mentionedUser = $this->userRepository->findById($userId);

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
