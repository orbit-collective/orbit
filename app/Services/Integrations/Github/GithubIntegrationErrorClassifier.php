<?php

namespace App\Services\Integrations\Github;

use Illuminate\Contracts\Encryption\DecryptException;
use Throwable;

/**
 * Turns an exception raised while syncing a GitHub integration into a small,
 * safe-to-store, safe-to-display GithubSyncError. Never echoes
 * $exception->getMessage() to the user or the database — every message here
 * is curated per known orbit-api error code, so a leaked URL, header, or
 * upstream response fragment can never reach a stored column or the UI.
 *
 * Permanent (user action required, not worth retrying automatically):
 * CONNECTION_REVOKED (handled specially by the synchronizer, which also
 * flips the local connection to revoked - this classifier still maps it in
 * case it's ever inspected directly), INVALID_RELAY_TOKEN,
 * AUTHORIZATION_REQUIRED, INVALID_AUTHORIZATION (the relay token itself is
 * unusable), CONNECTION_NOT_CONNECTED, INCOMPLETE_CONNECTION (the remote
 * connection record isn't in a usable state), TOKEN_UNREADABLE_CODE (the
 * *local* copy of the token can't be decrypted at all - see
 * ProjectIntegration::resolveGithubRelayToken()). Everything else - a
 * transport-level failure (no error code at all), an unrecognized code, or
 * a 5xx from orbit-api - is treated as transient.
 */
class GithubIntegrationErrorClassifier
{
    /**
     * Not an orbit-api error code (nothing was ever sent) - a local,
     * permanent condition: the stored relay token can't be decrypted with
     * the app's current key. Shared with GithubIntegrationHealthService and
     * GithubIntegrationSynchronizer, which construct/record this directly
     * rather than via classify() (there's no exception to classify - the
     * request is never even attempted).
     */
    public const string TOKEN_UNREADABLE_CODE = 'LOCAL_TOKEN_UNREADABLE';

    public const string TOKEN_UNREADABLE_MESSAGE = 'Orbit could not read its stored GitHub connection details. Reconnect to restore access.';

    private const array PERMANENT_CODES = [
        'CONNECTION_REVOKED',
        'INVALID_RELAY_TOKEN',
        'AUTHORIZATION_REQUIRED',
        'INVALID_AUTHORIZATION',
        'CONNECTION_NOT_CONNECTED',
        'INCOMPLETE_CONNECTION',
        self::TOKEN_UNREADABLE_CODE,
    ];

    private const string RECONNECT_MESSAGE = 'Orbit no longer has access to this GitHub connection.';

    public function classify(Throwable $exception): GithubSyncError
    {
        if ($exception instanceof DecryptException) {
            return new GithubSyncError(self::TOKEN_UNREADABLE_CODE, self::TOKEN_UNREADABLE_MESSAGE, isTransient: false);
        }

        $code = $exception instanceof OrbitRelayApiException ? $exception->errorCode : null;

        if ($code === 'CONNECTION_REVOKED') {
            return new GithubSyncError($code, 'The GitHub connection has been revoked.', isTransient: false);
        }

        if (in_array($code, self::PERMANENT_CODES, true)) {
            return new GithubSyncError($code, self::RECONNECT_MESSAGE, isTransient: false);
        }

        if ($code === null) {
            return new GithubSyncError(null, 'Orbit could not reach the GitHub relay service.', isTransient: true);
        }

        return new GithubSyncError($code, 'The GitHub integration encountered a temporary synchronization error.', isTransient: true);
    }
}
