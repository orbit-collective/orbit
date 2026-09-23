<?php

use App\Services\Integrations\Github\OrbitRelayApiException;
use App\Services\Integrations\Github\OrbitRelayClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

beforeEach(function () {
    $this->client = app(OrbitRelayClient::class);
});

test('createConnection sends no auth header and returns the mapped connection/token/installUrl', function () {
    Http::fake(['*/v1/github/connections' => Http::response([
        'success' => true,
        'data' => [
            'connection' => ['id' => 'conn_1', 'status' => 'pending', 'installationId' => null, 'repository' => null, 'createdAt' => 'now', 'connectedAt' => null, 'revokedAt' => null],
            'token' => 'orb_local_abc',
            'installUrl' => 'https://github.com/apps/orbit/installations/new?state=xyz',
        ],
    ], 201)]);

    $result = $this->client->createConnection();

    expect($result['token'])->toBe('orb_local_abc')
        ->and($result['installUrl'])->toContain('installations/new')
        ->and($result['connection']->status)->toBe('pending');

    Http::assertSent(fn ($request) => ! $request->hasHeader('Authorization'));
});

test('getConnection sends the Bearer token and maps the response', function () {
    Http::fake(['*/v1/github/connections/me' => Http::response([
        'success' => true,
        'data' => ['id' => 'conn_1', 'status' => 'connected', 'installationId' => 163077216, 'repository' => ['id' => 1, 'owner' => 'orbit-collective', 'name' => 'orbit'], 'createdAt' => 'now', 'connectedAt' => 'now', 'revokedAt' => null],
    ], 200)]);

    $connection = $this->client->getConnection('orb_local_abc');

    expect($connection->status)->toBe('connected')
        ->and($connection->repositoryOwner)->toBe('orbit-collective');

    Http::assertSent(fn ($request) => $request->hasHeader('Authorization', 'Bearer orb_local_abc'));
});

test('listEvents maps every event in the response', function () {
    Http::fake(['*/v1/github/events' => Http::response([
        'success' => true,
        'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => ['id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => '<!-- orbit-issue:1 -->'], 'createdAt' => 'now'],
        ]],
    ], 200)]);

    $events = $this->client->listEvents('orb_local_abc');

    expect($events)->toHaveCount(1)
        ->and($events[0]->pullRequestNumber)->toBe(283)
        ->and($events[0]->pullRequestTitle)->toBeNull()
        ->and($events[0]->pullRequestSourceBranch)->toBeNull()
        ->and($events[0]->pullRequestTargetBranch)->toBeNull()
        ->and($events[0]->pullRequestDraft)->toBeNull();
});

test('listEvents maps pull request title, branches, and draft state when present', function () {
    Http::fake(['*/v1/github/events' => Http::response([
        'success' => true,
        'data' => ['events' => [
            ['id' => 'evt_1', 'type' => 'pull_request', 'action' => 'opened', 'deliveryId' => 'd1', 'repository' => ['id' => 1], 'pullRequest' => [
                'id' => 10, 'number' => 283, 'url' => 'https://github.com/o/r/pull/283', 'body' => '<!-- orbit-issue:1 -->',
                'title' => 'Fix login redirect', 'sourceBranch' => 'fix/login-redirect', 'targetBranch' => 'master', 'draft' => true,
            ], 'createdAt' => 'now'],
        ]],
    ], 200)]);

    $events = $this->client->listEvents('orb_local_abc');

    expect($events[0]->pullRequestTitle)->toBe('Fix login redirect')
        ->and($events[0]->pullRequestSourceBranch)->toBe('fix/login-redirect')
        ->and($events[0]->pullRequestTargetBranch)->toBe('master')
        ->and($events[0]->pullRequestDraft)->toBeTrue();
});

test('createComment sends eventId, pullRequestNumber, and body', function () {
    Http::fake(['*/v1/github/comments' => Http::response([
        'success' => true,
        'data' => ['duplicate' => false, 'comment' => ['id' => 1, 'url' => 'https://github.com/o/r/pull/283#comment-1', 'author' => 'orbit-project-management[bot]']],
    ], 201)]);

    $result = $this->client->createComment('orb_local_abc', 'evt_1', 283, 'Synced with Orbit');

    expect($result->duplicate)->toBeFalse();

    Http::assertSent(fn ($request) => $request['eventId'] === 'evt_1' && $request['pullRequestNumber'] === 283 && $request['body'] === 'Synced with Orbit');
});

test('maps the orbit-api error envelope into a distinct code and message, without logging the token', function () {
    Log::spy();

    Http::fake(['*/v1/github/events' => Http::response([
        'success' => false,
        'error' => ['code' => 'CONNECTION_REVOKED', 'message' => 'This connection has been revoked.'],
    ], 401)]);

    try {
        $this->client->listEvents('orb_local_secret');
        $this->fail('Expected an OrbitRelayApiException.');
    } catch (OrbitRelayApiException $exception) {
        expect($exception->errorCode)->toBe('CONNECTION_REVOKED')
            ->and($exception->getMessage())->toBe('This connection has been revoked.');
    }

    Log::shouldHaveReceived('warning')->withArgs(function (string $message, array $context) {
        return ! str_contains(json_encode($context), 'orb_local_secret');
    });
});

test('a connection failure throws without leaking the token in the log context', function () {
    Log::spy();

    Http::fake(function () {
        throw new ConnectionException('Could not connect');
    });

    expect(fn () => $this->client->ackEvent('orb_local_secret', 'evt_1'))
        ->toThrow(OrbitRelayApiException::class);

    Log::shouldHaveReceived('warning')->withArgs(function (string $message, array $context) {
        return ! str_contains(json_encode($context), 'orb_local_secret');
    });
});
