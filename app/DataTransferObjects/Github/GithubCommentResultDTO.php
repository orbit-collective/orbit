<?php

namespace App\DataTransferObjects\Github;

/**
 * Maps orbit-api's CreateGitHubCommentResponse. `author` is only ever present
 * on a fresh (non-duplicate) comment creation — treat it as always-optional.
 */
final readonly class GithubCommentResultDTO
{
    public function __construct(
        public bool $duplicate,
        public int $commentId,
        public string $commentUrl,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            duplicate: $data['duplicate'],
            commentId: $data['comment']['id'],
            commentUrl: $data['comment']['url'],
        );
    }
}
