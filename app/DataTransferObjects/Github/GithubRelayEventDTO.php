<?php

namespace App\DataTransferObjects\Github;

/**
 * Maps orbit-api's GitHubRelayEventDto. The `pullRequest*` metadata fields
 * are only ever populated for `type: "pull_request"` events - a
 * `check_suite`/`pull_request_review` event only carries the PR identity
 * (repositoryId/pullRequestId/pullRequestNumber) plus its own
 * checkStatus/reviewState/reviewerLogin (see GithubRelayEventProcessor,
 * which is the only reader of those).
 */
final readonly class GithubRelayEventDTO
{
    public function __construct(
        public string $id,
        public string $type,
        public string $action,
        public string $deliveryId,
        public int $repositoryId,
        public int $pullRequestId,
        public int $pullRequestNumber,
        public ?string $pullRequestUrl,
        public ?string $pullRequestBody,
        public ?string $pullRequestTitle,
        public ?string $pullRequestSourceBranch,
        public ?string $pullRequestTargetBranch,
        public ?bool $pullRequestDraft,
        public ?string $pullRequestState,
        public ?bool $pullRequestMerged,
        public ?string $pullRequestMergedAt,
        public ?string $pullRequestUpdatedAt,
        public ?string $checkStatus,
        public ?string $reviewState,
        public ?string $reviewerLogin,
        public string $createdAt,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            id: $data['id'],
            type: $data['type'],
            action: $data['action'],
            deliveryId: $data['deliveryId'],
            repositoryId: $data['repository']['id'],
            pullRequestId: $data['pullRequestId'],
            pullRequestNumber: $data['pullRequestNumber'],
            pullRequestUrl: $data['pullRequest']['url'] ?? null,
            pullRequestBody: $data['pullRequest']['body'] ?? null,
            pullRequestTitle: $data['pullRequest']['title'] ?? null,
            pullRequestSourceBranch: $data['pullRequest']['sourceBranch'] ?? null,
            pullRequestTargetBranch: $data['pullRequest']['targetBranch'] ?? null,
            pullRequestDraft: $data['pullRequest']['draft'] ?? null,
            pullRequestState: $data['pullRequest']['state'] ?? null,
            pullRequestMerged: $data['pullRequest']['merged'] ?? null,
            pullRequestMergedAt: $data['pullRequest']['mergedAt'] ?? null,
            pullRequestUpdatedAt: $data['pullRequest']['updatedAt'] ?? null,
            checkStatus: $data['check']['status'] ?? null,
            reviewState: $data['review']['state'] ?? null,
            reviewerLogin: $data['review']['reviewerLogin'] ?? null,
            createdAt: $data['createdAt'],
        );
    }
}
