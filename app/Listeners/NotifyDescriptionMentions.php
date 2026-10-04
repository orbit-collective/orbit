<?php

namespace App\Listeners;

use App\Events\IssueCreated;
use App\Events\IssueMentioned;
use App\Events\IssueUpdated;
use App\Models\Issue;
use App\Repositories\ProjectRepository;
use App\Repositories\UserRepository;

/**
 * Turns "@[Name](id)" mention tokens in an issue's description into
 * IssueMentioned events (the same ones comment mentions raise), so a
 * mentioned member gets the same notification either way.
 *
 * Only members of the issue's project are notified, never the actor, and
 * only for mentions that were not already in the previous description - so
 * editing other parts of a description doesn't re-notify everyone in it.
 */
class NotifyDescriptionMentions
{
    public function __construct(
        protected ProjectRepository $projectRepository,
        protected UserRepository $userRepository,
    ) {}

    public function handle(IssueCreated|IssueUpdated $event): void
    {
        if ($event instanceof IssueUpdated) {
            if (! array_key_exists('description', $event->changes)) {
                return;
            }

            $previous = $this->extractMentionedUserIds((string) ($event->changes['description']['old'] ?? ''));
        } else {
            $previous = [];
        }

        $mentioned = array_diff($this->extractMentionedUserIds((string) $event->issue->description), $previous);

        $this->notify($event->issue, $event->actor, $mentioned);
    }

    /**
     * @param  list<int>  $userIds
     */
    private function notify(Issue $issue, mixed $actor, array $userIds): void
    {
        $userIds = array_filter($userIds, fn (int $id) => $id !== $actor?->id);

        if (empty($userIds)) {
            return;
        }

        $memberIds = $this->projectRepository->getMemberIds($issue->project);

        foreach (array_intersect($userIds, $memberIds) as $userId) {
            $user = $this->userRepository->findById($userId);

            if ($user) {
                event(new IssueMentioned($issue, null, $user, $actor));
            }
        }
    }

    /**
     * @return list<int>
     */
    private function extractMentionedUserIds(string $description): array
    {
        preg_match_all('/@\[[^\]]+\]\((\d+)\)/', $description, $matches);

        return array_values(array_unique(array_map('intval', $matches[1] ?? [])));
    }
}
