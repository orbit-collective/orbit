<?php

use App\Models\ProjectIntegration;
use App\Services\Integrations\Github\GithubIntegrationHealth;
use App\Services\Integrations\Github\GithubIntegrationHealthService;

beforeEach(function () {
    $this->service = new GithubIntegrationHealthService;
});

function healthFor(array $attributes): ProjectIntegration
{
    return new ProjectIntegration([
        'integration' => 'github',
        ...$attributes,
    ]);
}

test('a healthy, connected integration with no failures is healthy', function () {
    $pi = healthFor(['github_status' => 'connected', 'github_consecutive_failures' => 0]);

    expect($this->service->determine($pi))->toBe(GithubIntegrationHealth::Healthy);
});

test('a connected integration with recent transient failures is degraded', function () {
    $pi = healthFor(['github_status' => 'connected', 'github_consecutive_failures' => 2, 'github_last_error_code' => null]);

    expect($this->service->determine($pi))->toBe(GithubIntegrationHealth::Degraded);
});

test('an invalid relay token is error regardless of the failure count', function () {
    $pi = healthFor(['github_status' => 'connected', 'github_consecutive_failures' => 1, 'github_last_error_code' => 'INVALID_RELAY_TOKEN']);

    expect($this->service->determine($pi))->toBe(GithubIntegrationHealth::Error);
});

test('a revoked connection is revoked regardless of leftover error state', function () {
    $pi = healthFor(['github_status' => 'revoked', 'github_consecutive_failures' => 5, 'github_last_error_code' => 'INVALID_RELAY_TOKEN']);

    expect($this->service->determine($pi))->toBe(GithubIntegrationHealth::Revoked);
});

test('a pending connection has no health yet', function () {
    $pi = healthFor(['github_status' => 'pending']);

    expect($this->service->determine($pi))->toBeNull();
});

test('no connection at all has no health', function () {
    $pi = healthFor(['github_status' => null]);

    expect($this->service->determine($pi))->toBeNull();
});

test('recovering after a failure (consecutive_failures reset to 0) returns to healthy', function () {
    $pi = healthFor(['github_status' => 'connected', 'github_consecutive_failures' => 0, 'github_last_error_code' => null]);

    expect($this->service->determine($pi))->toBe(GithubIntegrationHealth::Healthy);
});
