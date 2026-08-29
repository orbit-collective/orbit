<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Generic "POST this JSON payload to this webhook URL" job — deliberately
 * not Discord-specific, so any future webhook-based integration (Slack,
 * Teams, ...) can reuse it as-is; only the payload shape differs per
 * integration, and that's built by the integration's own IntegrationNotifier.
 *
 * Implements ShouldBeEncrypted because $webhookUrl carries a bearer secret —
 * without it, the serialized job (including its terminal copy in
 * failed_jobs once retries are exhausted) would retain the secret in plain
 * text in the queue connection's storage.
 */
class SendWebhookNotificationJob implements ShouldBeEncrypted, ShouldQueue
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
        try {
            $response = Http::timeout(5)->post($this->webhookUrl, $this->payload);
        } catch (ConnectionException) {
            // Guzzle's connection-level exception message embeds the full
            // request URL (and therefore the webhook's bearer secret) — never
            // let it propagate as-is into queue exception reporting/failed_jobs.
            Log::warning('Webhook notification failed to connect', [
                'url' => $this->redactedWebhookUrl(),
            ]);

            throw new RuntimeException("Webhook delivery failed to connect: {$this->redactedWebhookUrl()}");
        }

        if ($response->failed()) {
            Log::warning('Webhook notification failed', [
                'url' => $this->redactedWebhookUrl(),
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $response->throw();
        }
    }

    /**
     * Never log the raw webhook URL — it embeds a bearer secret (e.g. a
     * Discord webhook token), so anyone with log access could otherwise
     * post to the channel it targets.
     */
    private function redactedWebhookUrl(): string
    {
        $parts = parse_url($this->webhookUrl);

        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? 'unknown-host';

        return "$scheme://$host/***";
    }
}
