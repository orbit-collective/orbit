<?php

namespace App\Services\Integrations;

use App\Contracts\IntegrationNotifier;
use Illuminate\Contracts\Container\Container;

/**
 * Maps an integration key (ProjectIntegration::integration) to the notifier
 * that knows how to talk to it. Adding a new integration is one line here
 * plus its IntegrationNotifier implementation — nothing else in the
 * notification-dispatch path needs to change.
 */
class IntegrationNotifierRegistry
{
    private const array MAP = [
        'discord' => DiscordIntegrationNotifier::class,
    ];

    public function __construct(protected Container $container) {}

    public function resolve(string $integration): ?IntegrationNotifier
    {
        $class = self::MAP[$integration] ?? null;

        return $class ? $this->container->make($class) : null;
    }
}
