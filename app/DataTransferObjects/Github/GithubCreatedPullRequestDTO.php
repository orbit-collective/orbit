<?php

namespace App\DataTransferObjects\Github;

final readonly class GithubCreatedPullRequestDTO
{
    public function __construct(
        public int $number,
        public string $url,
        public string $title,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            number: $data['number'],
            url: $data['url'],
            title: $data['title'],
        );
    }
}
