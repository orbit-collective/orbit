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
 */
class OrbitRelayApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?string $errorCode = null,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
    }
}
