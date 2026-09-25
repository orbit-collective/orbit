<?php

namespace App\DataTransferObjects\Github;

/** Maps a single entry of orbit-api's repositories array (connection or /v1/github/repositories response). */
final readonly class GithubRepositoryDTO
{
    public function __construct(
        public int $id,
        public string $owner,
        public string $name,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            id: $data['id'],
            owner: $data['owner'],
            name: $data['name'],
        );
    }
}
