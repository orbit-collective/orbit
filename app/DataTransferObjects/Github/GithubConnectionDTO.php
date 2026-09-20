<?php

namespace App\DataTransferObjects\Github;

/**
 * Maps orbit-api's GitHubConnectionDto ({success:true,data:...} payload) —
 * never carries tokenHash/stateHash, which orbit-api itself never exposes.
 */
final readonly class GithubConnectionDTO
{
    public function __construct(
        public string $id,
        public string $status,
        public ?int $installationId,
        public ?int $repositoryId,
        public ?string $repositoryOwner,
        public ?string $repositoryName,
        public string $createdAt,
        public ?string $connectedAt,
        public ?string $revokedAt,
    ) {}

    public static function fromResponse(array $data): self
    {
        $repository = $data['repository'] ?? null;

        return new self(
            id: $data['id'],
            status: $data['status'],
            installationId: $data['installationId'] ?? null,
            repositoryId: $repository['id'] ?? null,
            repositoryOwner: $repository['owner'] ?? null,
            repositoryName: $repository['name'] ?? null,
            createdAt: $data['createdAt'],
            connectedAt: $data['connectedAt'] ?? null,
            revokedAt: $data['revokedAt'] ?? null,
        );
    }
}
