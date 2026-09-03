<?php

namespace App\Services\Integrations;

use App\Contracts\IntegrationImporter;
use App\Services\Integrations\Jira\JiraIntegrationImporter;
use Illuminate\Contracts\Container\Container;

/**
 * Maps an integration key (ProjectIntegration::integration) to the importer
 * that knows how to pull issues from it. Mirrors IntegrationNotifierRegistry
 * but for the inbound/import axis — adding a new import integration is one
 * line here plus its IntegrationImporter implementation.
 */
class IntegrationImporterRegistry
{
    private const array MAP = [
        'jira' => JiraIntegrationImporter::class,
    ];

    public function __construct(protected Container $container) {}

    /**
     * @throws \Illuminate\Contracts\Container\BindingResolutionException
     */
    public function resolve(string $integration): ?IntegrationImporter
    {
        $class = self::MAP[$integration] ?? null;

        return $class ? $this->container->make($class) : null;
    }
}
