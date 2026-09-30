<?php

namespace App\DataTransferObjects\Github;

/**
 * A GitHub identity resolved by orbit-api's centralized sign-in broker (see
 * documentation/en/authentication) - never a GitHub access token, only the
 * safe profile fields GithubOAuthService needs to log a user in or link
 * their account.
 */
final readonly class GithubIdentityDTO
{
    public function __construct(
        public string $githubId,
        public string $githubUsername,
        public ?string $email,
        public ?string $name,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            githubId: $data['githubId'],
            githubUsername: $data['githubUsername'],
            email: $data['email'],
            name: $data['name'],
        );
    }
}
