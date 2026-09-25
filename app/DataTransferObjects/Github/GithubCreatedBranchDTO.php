<?php

namespace App\DataTransferObjects\Github;

final readonly class GithubCreatedBranchDTO
{
    public function __construct(
        public string $name,
        public string $url,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            name: $data['name'],
            url: $data['url'],
        );
    }
}
