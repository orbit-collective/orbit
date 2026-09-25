<?php

namespace App\DataTransferObjects\Github;

/**
 * Maps orbit-api's GitHubConnectionDto ({success:true,data:...} payload) —
 * never carries tokenHash/stateHash, which orbit-api itself never exposes.
 * repositoryId/Owner/Name mirror the first entry of $repositories, kept for
 * the existing single-repository call sites (e.g. the scalar columns on
 * project_integrations); new code should read $repositories directly.
 */
final readonly class GithubConnectionDTO
{
    /**
     * @param  GithubRepositoryDTO[]  $repositories
     */
    public function __construct(
        public string $id,
        public string $status,
        public ?int $installationId,
        public array $repositories,
        public ?int $repositoryId,
        public ?string $repositoryOwner,
        public ?string $repositoryName,
        public string $createdAt,
        public ?string $connectedAt,
        public ?string $revokedAt,
    ) {}

    public static function fromResponse(array $data): self
    {
        $repositories = array_map(
            fn (array $repository) => GithubRepositoryDTO::fromResponse($repository),
            $data['repositories'] ?? [],
        );

        $primary = $repositories[0] ?? null;

        return new self(
            id: $data['id'],
            status: $data['status'],
            installationId: $data['installationId'] ?? null,
            repositories: $repositories,
            repositoryId: $primary?->id,
            repositoryOwner: $primary?->owner,
            repositoryName: $primary?->name,
            createdAt: $data['createdAt'],
            connectedAt: $data['connectedAt'] ?? null,
            revokedAt: $data['revokedAt'] ?? null,
        );
    }
}
