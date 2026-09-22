<?php

use App\Services\Integrations\Github\GithubIntegrationErrorClassifier;
use App\Services\Integrations\Github\OrbitRelayApiException;

beforeEach(function () {
    $this->classifier = new GithubIntegrationErrorClassifier;
});

test('CONNECTION_REVOKED is permanent with a revoked-specific message', function () {
    $error = $this->classifier->classify(new OrbitRelayApiException('raw upstream text', 'CONNECTION_REVOKED'));

    expect($error->code)->toBe('CONNECTION_REVOKED')
        ->and($error->isTransient)->toBeFalse()
        ->and($error->safeMessage)->toBe('The GitHub connection has been revoked.');
});

test('a token/connection-level code is permanent with a reconnect message', function (string $code) {
    $error = $this->classifier->classify(new OrbitRelayApiException('raw upstream text', $code));

    expect($error->code)->toBe($code)
        ->and($error->isTransient)->toBeFalse()
        ->and($error->safeMessage)->toBe('Orbit no longer has access to this GitHub connection.');
})->with([
    'INVALID_RELAY_TOKEN',
    'AUTHORIZATION_REQUIRED',
    'INVALID_AUTHORIZATION',
    'CONNECTION_NOT_CONNECTED',
    'INCOMPLETE_CONNECTION',
]);

test('a transport-level failure with no error code is transient', function () {
    $error = $this->classifier->classify(new OrbitRelayApiException('Orbit relay API request failed to connect: GET /v1/github/events'));

    expect($error->code)->toBeNull()
        ->and($error->isTransient)->toBeTrue()
        ->and($error->safeMessage)->toBe('Orbit could not reach the GitHub relay service.');
});

test('an unrecognized or server-side error code is transient', function () {
    $error = $this->classifier->classify(new OrbitRelayApiException('raw upstream text', 'INTERNAL_SERVER_ERROR'));

    expect($error->code)->toBe('INTERNAL_SERVER_ERROR')
        ->and($error->isTransient)->toBeTrue()
        ->and($error->safeMessage)->toBe('The GitHub integration encountered a temporary synchronization error.');
});

test('a generic exception with no orbit-api error code is transient', function () {
    $error = $this->classifier->classify(new RuntimeException('some internal failure with a stack trace'));

    expect($error->code)->toBeNull()
        ->and($error->isTransient)->toBeTrue()
        ->and($error->safeMessage)->toBe('Orbit could not reach the GitHub relay service.');
});

test('the safe message never contains the raw exception text', function () {
    $error = $this->classifier->classify(new OrbitRelayApiException('Bearer orb_local_super_secret_value leaked here', 'INVALID_RELAY_TOKEN'));

    expect($error->safeMessage)->not->toContain('orb_local_super_secret_value');
});
