<?php

use App\Jobs\SendWebhookNotificationJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

uses(RefreshDatabase::class);

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

test('it redacts the webhook url when the request fails at the transport level', function () {
    $secretUrl = 'https://discord.com/api/webhooks/123456789012345678/aBcDeFsEcReT';
    Http::fake(function () use ($secretUrl) {
        throw new ConnectionException("cURL error 6: Could not resolve host: discord.com for $secretUrl");
    });
    Log::spy();

    $job = new SendWebhookNotificationJob($secretUrl, ['content' => 'hi']);

    $thrown = null;

    try {
        $job->handle();
    } catch (Throwable $exception) {
        $thrown = $exception;
    }

    expect($thrown)->not->toBeNull()
        ->and($thrown)->not->toBeInstanceOf(ConnectionException::class)
        ->and($thrown->getMessage())->not->toContain('aBcDeFsEcReT');

    Log::shouldHaveReceived('warning')->once()->withArgs(function (string $message, array $context) {
        return $message === 'Webhook notification failed to connect'
            && $context['url'] === 'https://discord.com/***';
    });
});

test('the queued payload never stores the webhook url in plain text', function () {
    config(['queue.default' => 'database']);

    SendWebhookNotificationJob::dispatch('https://discord.com/api/webhooks/123456789012345678/aBcDeFsEcReT', ['content' => 'hi']);

    $stored = DB::table('jobs')->first();

    expect($stored)->not->toBeNull()
        ->and($stored->payload)->not->toContain('aBcDeFsEcReT')
        ->and($stored->payload)->not->toContain('https://discord.com/api/webhooks');
});
