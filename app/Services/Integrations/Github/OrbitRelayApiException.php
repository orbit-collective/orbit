<?php

namespace App\Services\Integrations\Github;

use RuntimeException;
use Throwable;

/**
 * Raised for both a transport failure (no `errorCode`) and an orbit-api
 * error envelope ({success:false,error:{code,message}}). Keeping the API's
 * `code` separate from the exception message (and from PHP's own built-in,
 * non-readonly `Exception::$code`) lets callers branch on stable
 * machine-readable codes (e.g. CONNECTION_REVOKED) without parsing text.
 *
 * `isTimeout` marks a transport failure caused by a time limit - the relay did
 * not answer in time, or the connection itself timed out - as opposed to one
 * that failed outright (DNS, refused, TLS). It does not say which of the two
 * timeouts happened; the logged transport `reason` does.
 */
class OrbitRelayApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?string $errorCode = null,
        ?Throwable $previous = null,
        public readonly bool $isTimeout = false,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
