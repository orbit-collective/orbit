<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectIntegration;
use App\Repositories\ProjectIntegrationRepository;
use Illuminate\Validation\ValidationException;

class ProjectIntegrationService
{
    /**
     * The only integration actually wired up so far. Every other catalog entry
     * shown on the frontend is locked as "coming soon" — enforced here too, so
     * the restriction doesn't rely on the frontend alone.
     */
    public const array AVAILABLE_INTEGRATIONS = ['discord'];

    /**
     * The sub-options each available integration actually understands. Keys
     * outside this list are silently dropped when settings are saved, so a
     * client can never persist an option a given integration doesn't have.
     */
    private const array AVAILABLE_OPTIONS = [
        'discord' => ['issue-activity', 'comment-activity'],
    ];

    /**
     * Per-integration webhook URL shape. Adding a new webhook-based integration
     * just needs an entry here (or none, to skip format validation).
     */
    private const array WEBHOOK_URL_PATTERNS = [
        'discord' => '/^https:\/\/(canary\.|ptb\.)?discord(app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/',
    ];

    public function __construct(
        protected ProjectIntegrationRepository $projectIntegrationRepository,
        protected ActivityLogService $activityLogService,
    ) {}

    /**
     * @return array<string, bool> enabled state keyed by integration id, for every
     *                              currently available integration.
     */
    public function getStatuses(Project $project): array
    {
        return array_map(
            fn (array $settings) => $settings['enabled'],
            $this->getSettings($project),
        );
    }

    /**
     * @return array<string, array{enabled: bool, webhookUrl: ?string, options: array<string, bool>}>
     */
    public function getSettings(Project $project): array
    {
        $settings = [];

        foreach (self::AVAILABLE_INTEGRATIONS as $integration) {
            $record = $this->projectIntegrationRepository->findForProject($project, $integration);

            $settings[$integration] = [
                'enabled' => $record?->enabled ?? false,
                'webhookUrl' => $record?->webhook_url,
                'options' => array_merge(
                    array_fill_keys(self::AVAILABLE_OPTIONS[$integration] ?? [], false),
                    $record?->options ?? [],
                ),
            ];
        }

        return $settings;
    }

    public function setEnabled(Project $project, string $integration, bool $enabled): ProjectIntegration
    {
        $this->assertAvailable($integration);

        $record = $this->projectIntegrationRepository->updateOrCreate($project, $integration, ['enabled' => $enabled]);

        $action = $enabled ? 'Enabled' : 'Disabled';
        $this->activityLogService->log($project->id, "$action the \"$integration\" integration");

        return $record;
    }

    /**
     * @param  array{webhook_url?: ?string, options?: array<string, bool>}  $data
     */
    public function updateSettings(Project $project, string $integration, array $data): ProjectIntegration
    {
        $this->assertAvailable($integration);

        $attributes = [];

        if (array_key_exists('webhook_url', $data)) {
            $attributes['webhook_url'] = $this->validateWebhookUrl($integration, $data['webhook_url']);
        }

        if (array_key_exists('options', $data)) {
            $existingOptions = $this->projectIntegrationRepository->findForProject($project, $integration)?->options ?? [];
            $allowedKeys = self::AVAILABLE_OPTIONS[$integration] ?? [];
            $incomingOptions = array_intersect_key($data['options'], array_flip($allowedKeys));

            $attributes['options'] = array_merge($existingOptions, $incomingOptions);
        }

        $record = $this->projectIntegrationRepository->updateOrCreate($project, $integration, $attributes);

        $this->activityLogService->log($project->id, "Updated settings for the \"$integration\" integration");

        return $record;
    }

    private function validateWebhookUrl(string $integration, ?string $webhookUrl): ?string
    {
        if ($webhookUrl === null || $webhookUrl === '') {
            return null;
        }

        $pattern = self::WEBHOOK_URL_PATTERNS[$integration] ?? null;

        if ($pattern && ! preg_match($pattern, $webhookUrl)) {
            throw ValidationException::withMessages([
                'webhook_url' => 'This does not look like a valid webhook URL for this integration.',
            ]);
        }

        return $webhookUrl;
    }

    private function assertAvailable(string $integration): void
    {
        if (! in_array($integration, self::AVAILABLE_INTEGRATIONS, true)) {
            throw ValidationException::withMessages([
                'integration' => 'This integration is not available yet.',
            ]);
        }
    }
}
