<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class NsfwDetectionService
{
    public function classify(UploadedFile $file): array
    {
        if (! config('services.nsfw.enabled')) {
            return [];
        }

        $response = Http::withBody(
            file_get_contents($file->getRealPath()),
            'application/octet-stream'
        )
            ->timeout(5)
            ->retry(2, 100)
            ->post(config('services.nsfw.url') . '/classify');

        if ($response->failed()) {
            throw new RuntimeException(
                'Unable to classify image.'
            );
        }

        return $response->json('prediction', []);
    }

    public function isUnsafe(array $predictions): bool
    {
        $threshold = (float) config('services.nsfw.threshold');

        foreach ($predictions as $prediction) {
            $class = $prediction['className'];
            $probability = $prediction['probability'];

            if (
                in_array($class, ['Porn', 'Hentai'], true)
                && $probability >= $threshold
            ) {
                return true;
            }

            if (
                $class === 'Sexy'
                && $probability >= 0.90
            ) {
                return true;
            }
        }

        return false;
    }

    public function validate(UploadedFile $file): bool
    {
        if (! config('services.nsfw.enabled')) {
            return true;
        }

        return ! $this->isUnsafe(
            $this->classify($file)
        );
    }
}
