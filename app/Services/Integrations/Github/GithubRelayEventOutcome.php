<?php

namespace App\Services\Integrations\Github;

/**
 * What GithubRelayEventProcessor decided to do with an event — both cases
 * mean "safe to ack now, this outcome is permanent and correct". A
 * transient failure never produces one of these: it throws instead, so the
 * poller knows to leave the event pending for the next tick.
 */
enum GithubRelayEventOutcome
{
    /** Unsupported event, no marker, ambiguous markers, or issue not resolvable in this project. */
    case Skipped;

    /** The PR was linked (or re-linked, idempotently) and the bot comment was requested. */
    case Linked;
}
