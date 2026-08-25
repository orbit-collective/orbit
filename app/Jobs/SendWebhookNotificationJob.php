<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Generic "POST this JSON payload to this webhook URL" job — deliberately
 * not Discord-specific, so any future webhook-based integration (Slack,
 * Teams, ...) can reuse it as-is; only the payload shape differs per
 * integration, and that's built by the integration's own IntegrationNotifier.
 */
class SendWebhookNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public readonly string $webhookUrl,
        public readonly array $payload,
    ) {}

    public function backoff(): array
    {
        return [5, 15, 30];
    }

    public function handle(): void
    {
        $response = Http::timeout(5)->post($this->webhookUrl, $this->payload);

        if ($response->failed()) {
            Log::warning('Webhook notification failed', [
                'url' => $this->webhookUrl,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
        }
    }
}
