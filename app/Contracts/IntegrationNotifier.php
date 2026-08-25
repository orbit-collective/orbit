<?php

namespace App\Contracts;

use App\Models\ProjectIntegration;

/**
 * One implementation per integration key (see IntegrationNotifierRegistry).
 * Adding a new webhook-based integration is: implement this, register it in
 * the registry's map, done — the listener that fires these never changes.
 */
interface IntegrationNotifier
{
    /**
     * $event is one of the domain events the notifier's integration cares
     * about (see NotifyProjectIntegrationsListener's category mapping).
     * Implementations should silently no-op on an event/config combination
     * they don't know how to handle, rather than throwing.
     */
    public function handle(ProjectIntegration $projectIntegration, object $event): void;
}
