<?php

use App\Jobs\SendWebhookNotificationJob;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

test('it does not log or throw on a successful delivery', function () {
    Http::fake(['https://discord.com/*' => Http::response(['ok' => true], 200)]);
    Log::spy();

    (new SendWebhookNotificationJob('https://discord.com/api/webhooks/123456789012345678/aBcDeFsEcReT', ['content' => 'hi']))->handle();

    Log::shouldNotHaveReceived('warning');
});

test('it redacts the webhook url when logging a failed delivery', function () {
    Http::fake(['https://discord.com/*' => Http::response('rate limited', 429)]);
    Log::spy();

    $job = new SendWebhookNotificationJob('https://discord.com/api/webhooks/123456789012345678/aBcDeFsEcReT', ['content' => 'hi']);

    try {
        $job->handle();
    } catch (RequestException) {
        // expected — asserted separately below
    }

    Log::shouldHaveReceived('warning')->once()->withArgs(function (string $message, array $context) {
        return $message === 'Webhook notification failed'
            && $context['url'] === 'https://discord.com/***'
            && ! str_contains($context['url'], 'aBcDeFsEcReT')
            && $context['status'] === 429;
    });
});

test('it throws on a failed delivery so the queue applies retries and backoff', function () {
    Http::fake(['https://discord.com/*' => Http::response('service unavailable', 503)]);
    Log::spy();

    $job = new SendWebhookNotificationJob('https://discord.com/api/webhooks/123456789012345678/aBcDeFsEcReT', ['content' => 'hi']);

    expect(fn () => $job->handle())->toThrow(RequestException::class);
});
