<?php

use App\Services\NsfwDetectionService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config([
        'services.nsfw.enabled' => true,
        'services.nsfw.url' => 'http://nsfwjs:3333',
        'services.nsfw.threshold' => 0.70,
    ]);

    $this->service = new NsfwDetectionService;
});

test('classify posts the image body to the nsfw service and returns the prediction', function () {
    Http::fake([
        'http://nsfwjs:3333/classify' => Http::response([
            'prediction' => [
                ['className' => 'Neutral', 'probability' => 0.95],
            ],
        ]),
    ]);

    $file = UploadedFile::fake()->create('avatar.jpg', 100);

    $prediction = $this->service->classify($file);

    expect($prediction)->toBe([
        ['className' => 'Neutral', 'probability' => 0.95],
    ]);

    Http::assertSent(function ($request) {
        return $request->url() === 'http://nsfwjs:3333/classify';
    });
});

test('classify returns an empty array without calling the service when nsfw detection is disabled', function () {
    config(['services.nsfw.enabled' => false]);
    Http::fake();

    $file = UploadedFile::fake()->create('avatar.jpg', 100);

    expect($this->service->classify($file))->toBe([]);
    Http::assertNothingSent();
});

test('classify throws when the nsfw service request keeps failing after retries', function () {
    Http::fake([
        'http://nsfwjs:3333/classify' => Http::response(null, 500),
    ]);

    $file = UploadedFile::fake()->create('avatar.jpg', 100);

    // ->retry() throws its own RequestException once retries are exhausted,
    // so the service's own "Unable to classify image." RuntimeException
    // guard is only reached for a failure that doesn't throw on its own.
    expect(fn () => $this->service->classify($file))
        ->toThrow(RequestException::class);
});

test('isUnsafe flags porn and hentai predictions above the threshold', function () {
    expect($this->service->isUnsafe([
        ['className' => 'Porn', 'probability' => 0.80],
    ]))->toBeTrue();

    expect($this->service->isUnsafe([
        ['className' => 'Hentai', 'probability' => 0.80],
    ]))->toBeTrue();
});

test('isUnsafe does not flag porn predictions below the threshold', function () {
    expect($this->service->isUnsafe([
        ['className' => 'Porn', 'probability' => 0.50],
    ]))->toBeFalse();
});

test('isUnsafe flags a sexy prediction only above its own higher threshold', function () {
    expect($this->service->isUnsafe([
        ['className' => 'Sexy', 'probability' => 0.95],
    ]))->toBeTrue();

    expect($this->service->isUnsafe([
        ['className' => 'Sexy', 'probability' => 0.80],
    ]))->toBeFalse();
});

test('isUnsafe returns false for a neutral prediction', function () {
    expect($this->service->isUnsafe([
        ['className' => 'Neutral', 'probability' => 0.99],
    ]))->toBeFalse();
});

test('validate returns true without calling the service when nsfw detection is disabled', function () {
    config(['services.nsfw.enabled' => false]);
    Http::fake();

    $file = UploadedFile::fake()->create('avatar.jpg', 100);

    expect($this->service->validate($file))->toBeTrue();
    Http::assertNothingSent();
});

test('validate returns false for an image classified as unsafe', function () {
    Http::fake([
        'http://nsfwjs:3333/classify' => Http::response([
            'prediction' => [
                ['className' => 'Porn', 'probability' => 0.95],
            ],
        ]),
    ]);

    $file = UploadedFile::fake()->create('avatar.jpg', 100);

    expect($this->service->validate($file))->toBeFalse();
});

test('validate returns true for an image classified as safe', function () {
    Http::fake([
        'http://nsfwjs:3333/classify' => Http::response([
            'prediction' => [
                ['className' => 'Neutral', 'probability' => 0.99],
            ],
        ]),
    ]);

    $file = UploadedFile::fake()->create('avatar.jpg', 100);

    expect($this->service->validate($file))->toBeTrue();
});
