<?php

namespace App\DataTransferObjects\Github;

/**
 * Maps orbit-api's GitHubRelayEventDto. `pullRequestBody` is always a string
 * (orbit-api coerces a null GitHub webhook body to "" at ingestion), never
 * null, but the local marker parser still tolerates null/empty defensively.
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
        public string $pullRequestUrl,
        public string $pullRequestBody,
        public ?string $pullRequestTitle,
        public ?string $pullRequestSourceBranch,
        public ?string $pullRequestTargetBranch,
        public ?bool $pullRequestDraft,
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
            pullRequestId: $data['pullRequest']['id'],
            pullRequestNumber: $data['pullRequest']['number'],
            pullRequestUrl: $data['pullRequest']['url'],
            pullRequestBody: $data['pullRequest']['body'] ?? '',
            pullRequestTitle: $data['pullRequest']['title'] ?? null,
            pullRequestSourceBranch: $data['pullRequest']['sourceBranch'] ?? null,
            pullRequestTargetBranch: $data['pullRequest']['targetBranch'] ?? null,
            pullRequestDraft: $data['pullRequest']['draft'] ?? null,
            createdAt: $data['createdAt'],
        );
    }
}
